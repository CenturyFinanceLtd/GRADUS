import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import useAuth from "../hook/useAuth";
import { fetchRolePermissions, updateRolePermissions } from "../services/adminPermissions";

const normalizeRole = (role) => (role ? String(role).toLowerCase() : "");

const PermissionLayer = () => {
  const { token, admin, refreshPermissions } = useAuth();

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [pages, setPages] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  const currentRole = normalizeRole(admin?.role);

  const loadPermissions = useCallback(async () => {
    if (!token) {
      setRoles([]);
      setPages([]);
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
      const availablePages = Array.isArray(response?.pages) ? response.pages : [];
      const permissionsMap =
        response?.permissions && typeof response.permissions === "object"
          ? response.permissions
          : {};

      setRoles(availableRoles);
      setPages(availablePages.filter((page) => !page.public));
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
      setPages([]);
      setRolePermissions({});
      setSelectedRole("");
    } finally {
      setLoading(false);
    }
  }, [token]);

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

  const groupedPages = useMemo(() => {
    const groups = new Map();
    pages.forEach((page) => {
      const key = page.category || "Other";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(page);
    });
    return Array.from(groups.entries()).map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.label.localeCompare(b.label)),
    }));
  }, [pages]);

  const isRoleLocked = selectedRole === "programmer_admin";

  const handleTogglePage = (pageKey) => {
    if (isRoleLocked) {
      return;
    }

    setRolePermissions((prev) => {
      const current = new Set(prev[selectedRole] || []);
      if (current.has(pageKey)) {
        current.delete(pageKey);
      } else {
        current.add(pageKey);
      }
      return { ...prev, [selectedRole]: Array.from(current) };
    });
  };

  const handleSelectAll = () => {
    if (isRoleLocked) {
      return;
    }
    const allKeys = pages.map((page) => page.key);
    setRolePermissions((prev) => ({ ...prev, [selectedRole]: allKeys }));
  };

  const handleClearAll = () => {
    if (isRoleLocked) {
      return;
    }
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
              {roles.map((role) => {
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
                    key={role.key}
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

            {groupedPages.length === 0 ? (
              <p className='text-secondary-light mb-0'>No pages available.</p>
            ) : (
              <div className='d-flex flex-column gap-4'>
                {groupedPages.map(({ category, items }) => (
                  <div key={category} className='permission-category'>
                    <h6 className='mb-2 text-uppercase text-secondary-light'>{category}</h6>
                    <div className='row g-2'>
                      {items.map((page) => {
                        const checked = selectedRolePermissions.includes(page.key);
                        const inputId = `${selectedRole}-${page.key}`;
                        return (
                          <div className='col-12 col-md-6' key={page.key}>
                            <div className='form-check form-switch align-items-center'>
                              <input
                                className='form-check-input'
                                type='checkbox'
                                role='switch'
                                id={inputId}
                                checked={checked}
                                disabled={isRoleLocked || saving}
                                onChange={() => handleTogglePage(page.key)}
                              />
                              <label className='form-check-label ms-2' htmlFor={inputId}>
                                {page.label}
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
