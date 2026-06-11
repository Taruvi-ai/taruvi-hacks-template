import {
  dataProvider,
  authProvider,
  storageDataProvider,
  appDataProvider,
  userDataProvider,
  accessControlProvider,
} from "@taruvi/refine-providers";
import { taruviClient } from "../taruviClient";

export type { UserData as TaruviUser } from "@taruvi/sdk";
export type {
  TaruviMeta,
  TaruviListResponse,
  StorageUploadVariables,
  LoginParams,
  LogoutParams,
  RegisterParams,
  FunctionMeta,
  AnalyticsMeta,
} from "@taruvi/refine-providers";

export {
  buildRefineQueryParams,
  convertRefineFilters,
  convertRefineSorters,
  convertRefinePagination,
  buildQueryString,
  REFINE_OPERATOR_MAP,
} from "@taruvi/refine-providers";

/**
 * Refine providers for Taruvi
 *
 * - taruviDataProvider (default): Database CRUD
 * - taruviStorageProvider (storage): File upload/download/delete
 * - taruviAppProvider (app): Functions, analytics, roles, settings, secrets
 * - taruviUserProvider (user): User CRUD and roles
 * - taruviAuthProvider: Authentication
 * - taruviAccessControlProvider: Cerbos permission checks
 */

export const taruviDataProvider = dataProvider(taruviClient);
export const taruviAuthProvider = authProvider(taruviClient);
export const taruviStorageProvider = storageDataProvider(taruviClient);
export const taruviAppProvider = appDataProvider(taruviClient);
export const taruviUserProvider = userDataProvider(taruviClient);
export const taruviAccessControlProvider = accessControlProvider(taruviClient);
