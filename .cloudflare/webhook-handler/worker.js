/**
 * Cloudflare Worker: GitHub Webhook Handler for Auto-Deploy
 *
 * Receives push events from GitHub org webhook and triggers
 * taruvi-platform deployment workflow for configured projects.
 */

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // Verify webhook signature
      const signature = request.headers.get('x-hub-signature-256');
      if (!signature) {
        return new Response('Missing signature', { status: 401 });
      }

      const payload = await request.text();
      const isValid = await verifySignature(payload, signature, env.WEBHOOK_SECRET);

      if (!isValid) {
        return new Response('Invalid signature', { status: 401 });
      }

      const event = JSON.parse(payload);

      // Only handle push events
      if (request.headers.get('x-github-event') !== 'push') {
        return new Response(JSON.stringify({
          success: false,
          reason: 'wrong_event_type',
          message: 'Only push events are processed',
          event_type: request.headers.get('x-github-event')
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const repoFullName = event.repository.full_name;
      const repoName = event.repository.name;
      const branch = event.ref.replace('refs/heads/', '');
      const pusher = event.pusher.name;
      const commitSha = event.after; // The commit SHA that was pushed

      console.log(`📦 Push: ${repoFullName} @ ${branch} by ${pusher}`);

      // Fetch projects.yml
      const projectsConfig = await fetchProjectsConfig(env.GITHUB_TOKEN);

      if (!projectsConfig) {
        console.error('❌ Failed to fetch projects.yml');
        return new Response('Failed to fetch config', { status: 500 });
      }

      // Check if repo is configured
      const project = projectsConfig.external_projects?.[repoName];

      if (!project) {
        console.log(`⚠️  ${repoName} not in projects.yml - ignoring`);
        // Post status: not configured
        await postCommitStatus(
          repoFullName,
          commitSha,
          'error',
          `Not configured in projects.yml`,
          env.GITHUB_TOKEN
        );
        return new Response(JSON.stringify({
          success: false,
          reason: 'not_configured',
          message: `Repository "${repoName}" not found in projects.yml`,
          repo: repoName,
          branch: branch
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verify branch matches
      if (project.branch !== branch) {
        console.log(`⚠️  Branch ${branch} != ${project.branch} - ignoring`);
        // Post status: branch mismatch
        await postCommitStatus(
          repoFullName,
          commitSha,
          'error',
          `Branch mismatch: pushed "${branch}", configured "${project.branch}"`,
          env.GITHUB_TOKEN
        );
        return new Response(JSON.stringify({
          success: false,
          reason: 'branch_mismatch',
          message: `Branch "${branch}" does not match configured branch "${project.branch}"`,
          repo: repoName,
          pushed_branch: branch,
          configured_branch: project.branch
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verify repository matches
      if (project.repository !== repoFullName) {
        console.log(`⚠️  Repository mismatch - ignoring`);
        await postCommitStatus(
          repoFullName,
          commitSha,
          'error',
          'Repository configuration mismatch',
          env.GITHUB_TOKEN
        );
        return new Response(JSON.stringify({
          success: false,
          reason: 'repository_mismatch',
          message: 'Repository full name does not match configuration',
          repo: repoName
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.log(`✅ Triggering deploy for ${repoName}`);

      // Post pending status
      await postCommitStatus(
        repoFullName,
        commitSha,
        'pending',
        'Triggering deployment...',
        env.GITHUB_TOKEN
      );

      // Trigger taruvi-platform workflow
      const triggered = await triggerWorkflow(repoName, env.GITHUB_TOKEN);

      if (triggered) {
        console.log(`🚀 Deploy triggered for ${repoName}`);
        // Post success status
        await postCommitStatus(
          repoFullName,
          commitSha,
          'success',
          `Deploy triggered for ${repoName}`,
          env.GITHUB_TOKEN
        );
        return new Response(JSON.stringify({
          success: true,
          project: repoName,
          branch: branch,
          message: 'Deploy triggered'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        console.error(`❌ Failed to trigger deploy for ${repoName}`);
        // Post failure status
        await postCommitStatus(
          repoFullName,
          commitSha,
          'failure',
          'Failed to trigger deployment workflow',
          env.GITHUB_TOKEN
        );
        return new Response('Failed to trigger workflow', { status: 500 });
      }

    } catch (error) {
      console.error('❌ Error:', error);
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
};

async function verifySignature(payload, signature, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );

  const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return signature === expectedSignature;
}

async function fetchProjectsConfig(token) {
  const url = 'https://api.github.com/repos/Taruvi-ai/taruvi-platform/contents/.cloudflare/projects.yml';

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3.raw',
      'User-Agent': 'Taruvi-Webhook-Handler'
    }
  });

  if (!response.ok) {
    console.error(`Failed to fetch projects.yml: ${response.status}`);
    return null;
  }

  const yamlContent = await response.text();
  return parseSimpleYaml(yamlContent);
}

function parseSimpleYaml(yamlContent) {
  const lines = yamlContent.split('\n');
  const result = { external_projects: {} };
  let currentProject = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    // Project name (2 spaces indent)
    if (line.startsWith('  ') && !line.startsWith('    ') && trimmed.endsWith(':')) {
      currentProject = trimmed.slice(0, -1);
      result.external_projects[currentProject] = {};
      continue;
    }

    // Project properties (4 spaces indent)
    if (line.startsWith('    ') && currentProject) {
      const [key, ...valueParts] = trimmed.split(':');
      const value = valueParts.join(':').trim();
      result.external_projects[currentProject][key] = value;
    }
  }

  return result;
}

async function triggerWorkflow(projectName, token) {
  const url = 'https://api.github.com/repos/Taruvi-ai/taruvi-platform/dispatches';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Taruvi-Webhook-Handler'
    },
    body: JSON.stringify({
      event_type: 'deploy-cloudflare',
      client_payload: {
        project_name: projectName
      }
    })
  });

  return response.status === 204;
}

async function postCommitStatus(repoFullName, commitSha, state, description, token) {
  const url = `https://api.github.com/repos/${repoFullName}/statuses/${commitSha}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Taruvi-Webhook-Handler'
    },
    body: JSON.stringify({
      state: state, // 'success', 'failure', 'pending', 'error'
      description: description,
      context: 'Cloudflare Auto-Deploy',
      target_url: 'https://github.com/Taruvi-ai/taruvi-platform/actions'
    })
  });

  return response.ok;
}
