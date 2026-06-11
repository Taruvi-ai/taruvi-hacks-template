import React, { useState } from "react";
import Paper from "@mui/material/Paper";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Dashboard from "@mui/icons-material/Dashboard";
import MenuIcon from "@mui/icons-material/Menu";
import Logout from "@mui/icons-material/Logout";
import ListOutlined from "@mui/icons-material/ListOutlined";
import { useTranslate, type TreeMenuItem, CanAccess } from "@refinedev/core";
import { getAclResource } from "../../utils/aclResource";

interface MobileBottomNavProps {
  menuItems: TreeMenuItem[];
  selectedKey: string;
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  menuItems,
  selectedKey,
  onNavigate,
  onLogout,
}) => {
  const t = useTranslate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  // Show first 3 items in bottom nav, rest in "More" menu
  const visibleItems = menuItems.slice(0, 3);
  const moreItems = menuItems.slice(3);
  const hasMoreItems = moreItems.length > 0;

  const handleMoreClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMoreClose = () => {
    setAnchorEl(null);
  };

  const handleMoreItemClick = (route: string) => {
    onNavigate(route);
    handleMoreClose();
  };

  const handleLogoutClick = () => {
    onLogout();
    handleMoreClose();
  };

  // Determine which value is selected
  const getSelectedValue = () => {
    if (selectedKey === "/" || selectedKey === "dashboard") return "/";
    const visibleItem = visibleItems.find(
      (item) => item.route === selectedKey || item.key === selectedKey
    );
    if (visibleItem) return visibleItem.route || visibleItem.key || "";
    return "";
  };

  return (
    <>
      <Paper
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: { xs: "block", md: "none" },
          zIndex: 1200,
          borderTop: 1,
          borderColor: "divider",
        }}
        elevation={3}
      >
        <BottomNavigation
          value={getSelectedValue()}
          showLabels
        >
          {/* Dashboard */}
          <BottomNavigationAction
            label={t("dashboard.title", "Dashboard")}
            icon={<Dashboard />}
            value="/"
            onClick={() => onNavigate("/")}
          />

          {/* Visible menu items */}
          {visibleItems.map((item, index) => {
            const route = item.route || item.key || "";
            return (
              <CanAccess
                key={`visible-${item.key || item.route || item.name || "menu-item"}-${index}`}
                resource={getAclResource(item)}
                action="list"
                params={{ resource: item }}
              >
                <BottomNavigationAction
                  label={item.label || item.name}
                  icon={item.icon || <ListOutlined />}
                  value={route}
                  onClick={() => onNavigate(route)}
                />
              </CanAccess>
            );
          })}

          {/* More menu */}
          {hasMoreItems && (
            <BottomNavigationAction
              label={t("buttons.more", "More")}
              icon={<MenuIcon />}
              value="more"
              onClick={handleMoreClick}
            />
          )}
        </BottomNavigation>
      </Paper>

      {/* More menu popup */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMoreClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        {moreItems.map((item, index) => (
          <CanAccess
            key={`more-${item.key || item.route || item.name || "menu-item"}-${index}`}
            resource={getAclResource(item)}
            action="list"
            params={{ resource: item }}
          >
            <MenuItem
              onClick={() => handleMoreItemClick(item.route || "/")}
              selected={item.route === selectedKey || item.key === selectedKey}
            >
              <ListItemIcon>{item.icon || <ListOutlined />}</ListItemIcon>
              <ListItemText primary={item.label || item.name} />
            </MenuItem>
          </CanAccess>
        ))}

      </Menu>
    </>
  );
};
