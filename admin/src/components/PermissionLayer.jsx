import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import useAuth from "../hook/useAuth";
import { fetchRolePermissions, updateRolePermissions } from "../services/adminPermissions";

const normalizeRole = (role) => (role ? String(role).toLowerCase() : "");

import { sidebarConfig } from "../config/sidebarConfig";

const PermissionLayer = () => {
  const { token, admin, refreshPermissions, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  // We no longer strictly need 'pages' from API for rendering, 
  // but we might keep it if we want to validate keys. 
  // For now, sidebarConfig is our source of truth for the UI structure.
  const [rolePermissions, setRolePermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  const currentRole = normalizeRole(admin?.role);

  const loadPermissions = useCallback(async () => {
    if (authLoading || !token) {
      setRoles([]);
      setRolePermissions({});
      setSelectedRole("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setFeedback(null);

    try {
      const response = await fetchRolePermissions(token);
      const availableRoles = Array.isArray(response?.roles) ? response.roles : [];
      const permissionsMap =
        response?.permissions && typeof response.permissions === "object"
          ? response.permissions
          : {};

      setRoles(availableRoles);
      setRolePermissions(permissionsMap);

      setSelectedRole((prev) => {
        if (prev) {
          return prev;
        }
        const defaultRole = availableRoles.find((role) => role.key !== "programmer_admin");
        if (defaultRole) {
          return normalizeRole(defaultRole.key);
        }
        return availableRoles[0] ? normalizeRole(availableRoles[0].key) : "";
      });
    } catch (err) {
      setError(err.message || "Unable to load role permissions.");
      setRoles([]);
      setRolePermissions({});
      setSelectedRole("");
    } finally {
      setLoading(false);
    }
  }, [token, authLoading]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setFeedback(null);
  };

  const selectedRolePermissions = useMemo(() => {
    if (!selectedRole) {
      return [];
    }
    const stored = rolePermissions[selectedRole];
    return Array.isArray(stored) ? stored : [];
  }, [rolePermissions, selectedRole]);

  const isRoleLocked = selectedRole === "programmer_admin";

  // Helper to collect all keys (parent + children) from a config item
  const getAllKeys = (item) => {
    let keys = [];
    if (item.key) keys.push(item.key);
    if (item.children) {
      item.children.forEach((child) => {
        keys = keys.concat(getAllKeys(child));
      });
    }
    return keys;
  };

  const handleToggleItem = (itemKey, allChildKeys = []) => {
    if (isRoleLocked) return;

    setRolePermissions((prev) => {
      const current = new Set(prev[selectedRole] || []);
      const isChecked = current.has(itemKey);

      if (isChecked) {
        // Uncheck parent -> uncheck all children
        current.delete(itemKey);
        allChildKeys.forEach((k) => current.delete(k));
      } else {
        // Check parent -> check all children
        current.add(itemKey);
        allChildKeys.forEach((k) => current.add(k));
      }
      return { ...prev, [selectedRole]: Array.from(current) };
    });
  };

  // Helper to check if a specific key is permitted
  const hasPermission = (key) => selectedRolePermissions.includes(key);

  const handleSelectAll = () => {
    if (isRoleLocked) return;

    // Gather all keys from sidebarConfig
    const allKeys = [];
    sidebarConfig.forEach(item => {
      if (!item.programmerOnly) {
        allKeys.push(...getAllKeys(item));
      }
    });

    setRolePermissions((prev) => ({ ...prev, [selectedRole]: allKeys }));
  };

  const handleClearAll = () => {
    if (isRoleLocked) return;
    setRolePermissions((prev) => ({ ...prev, [selectedRole]: [] }));
  };

  const handleSave = async () => {
    if (!token || !selectedRole || isRoleLocked) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    setError("");

    try {
      const payload = rolePermissions[selectedRole] || [];
      const response = await updateRolePermissions({
        role: selectedRole,
        allowedPages: payload,
        token,
      });

      setRolePermissions((prev) => ({
        ...prev,
        [selectedRole]: Array.isArray(response?.allowedPages)
          ? response.allowedPages
          : payload,
      }));

      if (normalizeRole(admin?.role) === selectedRole) {
        await refreshPermissions();
      }

      setFeedback({
        type: "success",
        message: response?.message || "Permissions updated successfully.",
      });
    } catch (err) {
      setFeedback({
        type: "danger",
        message: err.message || "Unable to update permissions.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className='overlay'>
        <div className='d-flex align-items-center justify-content-center min-vh-100'>
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <div className='alert alert-danger mb-0' role='alert'>
        {error}
      </div>
    );
  }

  // Recursive render function for sidebar items
  const renderPermissionItem = (item) => {
    if (item.programmerOnly) return null; // Skip non-assignable items
    if (item.type === "header") return <h6 className="mt-3 mb-2 text-uppercase text-secondary-light" key={item.label}>{item.label}</h6>;

    const isGroup = item.children && item.children.length > 0;
    const allKeys = getAllKeys(item);
    const isChecked = hasPermission(item.key);

    // For visual feedback on groups: check if all children are checked (optional UI enhancement)
    // For now, we stick to strict check of the parent key itself.

    return (
      <div key={item.key} className="mb-2">
        <div className={`form-check form-switch d-flex align-items-center ${isGroup ? 'mb-1' : ''}`}>
          <input
            className="form-check-input flex-shrink-0"
            type="checkbox"
            role="switch"
            id={`perm-${selectedRole}-${item.key}`}
            checked={isChecked}
            disabled={isRoleLocked || saving}
            onChange={() => handleToggleItem(item.key, isGroup ? getAllKeys(item).filter(k => k !== item.key) : [])}
          />
          <label className="form-check-label ms-2 d-flex align-items-center gap-2 cursor-pointer" htmlFor={`perm-${selectedRole}-${item.key}`}>
            {item.icon && <Icon icon={item.icon} className="fs-5 text-secondary" />}
            <span className={isGroup ? "fw-medium" : ""}>{item.label}</span>
          </label>
        </div>

        {isGroup && (
          <div className="ms-4 border-start ps-3">
            {item.children.map(child => renderPermissionItem(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className='row g-4'>
      <div className='col-12 col-lg-4'>
        <div className='card h-100'>
          <div className='card-header d-flex align-items-center justify-content-between'>
            <h5 className='mb-0'>Roles</h5>
            <Icon icon='mdi:account-cog-outline' className='text-primary fs-4' />
          </div>
          <div className='card-body p-0'>
            <ul className='list-group list-group-flush'>
              {roles.map((role, index) => {
                const normalized = normalizeRole(role.key);
                const isActive = normalized === selectedRole;
                const roleClasses = [
                  "list-group-item",
                  "d-flex",
                  "align-items-center",
                  "justify-content-between",
                  "cursor-pointer",
                ];
                if (isActive) {
                  roleClasses.push("active");
                }
                return (
                  <li
                    key={role.key || index}
                    className={roleClasses.join(" ")}
                    onClick={() => handleRoleSelect(normalized)}
                    role='button'
                  >
                    <span>{role.label}</span>
                    {normalized === currentRole ? (
                      <span className='badge bg-primary-600'>You</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className='col-12 col-lg-8'>
        <div className='card h-100'>
          <div className='card-header d-flex align-items-center justify-content-between flex-wrap gap-2'>
            <div>
              <h5 className='mb-1'>Page access</h5>
              {isRoleLocked ? (
                <p className='text-sm text-secondary-light mb-0'>
                  Programmer(Admin) always has full access.
                </p>
              ) : (
                <p className='text-sm text-secondary-light mb-0'>
                  Select the pages this role can access.
                </p>
              )}
            </div>
            {!isRoleLocked && (
              <div className='d-flex align-items-center gap-2'>
                <button
                  type='button'
                  className='btn btn-outline-secondary btn-sm'
                  onClick={handleClearAll}
                  disabled={saving}
                >
                  Clear All
                </button>
                <button
                  type='button'
                  className='btn btn-outline-primary-600 btn-sm'
                  onClick={handleSelectAll}
                  disabled={saving}
                >
                  Select All
                </button>
              </div>
            )}
          </div>
          <div className='card-body'>
            {feedback ? (
              <div
                className={`alert alert-${feedback.type} py-12 px-16 mb-16`}
                role='alert'
              >
                {feedback.message}
              </div>
            ) : null}

            <div className='permission-list'>
              {sidebarConfig.map(item => renderPermissionItem(item))}
            </div>
          </div>
          <div className='card-footer d-flex justify-content-end gap-2'>
            <button
              type='button'
              className='btn btn-primary-600 px-32'
              onClick={handleSave}
              disabled={isRoleLocked || saving || !selectedRole}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionLayer;
