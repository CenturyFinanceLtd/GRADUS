import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import useAuth from "../hook/useAuth";
import {
  fetchAdminUsers,
  updateAdminUserRole,
} from "../services/adminUsers";

const ROLE_PROGRAMMER_ADMIN = "programmer_admin";
const ROLE_ADMIN = "admin";

const ROLE_OPTIONS = [
  { value: ROLE_PROGRAMMER_ADMIN, label: "Programmer(Admin)" },
  { value: ROLE_ADMIN, label: "Admin" },
];

const roleLabelMap = ROLE_OPTIONS.reduce((accumulator, option) => {
  accumulator[option.value] = option.label;
  return accumulator;
}, {});

const normalizeRole = (role) => (role ? String(role).toLowerCase() : "");

const statusStyles = {
  active: {
    className:
      "bg-success-focus text-success-600 border border-success-main px-24 py-4 radius-4 fw-medium text-sm",
    label: "Active",
  },
  inactive: {
    className:
      "bg-neutral-200 text-secondary-light border border-neutral-300 px-24 py-4 radius-4 fw-medium text-sm",
    label: "Inactive",
  },
};

const formatApiUser = (user) => ({
  id: user.id || user._id,
  fullName: user.fullName,
  email: user.email,
  department: user.department || "",
  status: user.status || "active",
  role: normalizeRole(user.role),
  roleLabel: user.roleLabel || roleLabelMap[normalizeRole(user.role)] || "Unknown",
  createdAt: user.createdAt,
});

const getInitials = (name) => {
  if (!name) {
    return "?";
  }
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AssignRoleLayer = () => {
  const { token, admin } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [roleUpdatingId, setRoleUpdatingId] = useState(null);

  const currentAdminId = admin?._id || admin?.id || admin?.adminId || null;

  const loadUsers = useCallback(
    async (nextFilters = {}) => {
      if (!token) {
        setUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await fetchAdminUsers(token, nextFilters);
        const list = Array.isArray(response?.users)
          ? response.users.map(formatApiUser)
          : [];
        setUsers(list);
      } catch (err) {
        setError(err.message || "Unable to fetch admin users.");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters({
        search: searchValue.trim(),
        status: statusFilter !== "all" ? statusFilter : "",
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [searchValue, statusFilter]);

  useEffect(() => {
    loadUsers(filters);
  }, [filters, loadUsers]);

  const visibleUsers = useMemo(() => users, [users]);

  const handleRoleChange = useCallback(
    async (user, newRole) => {
      if (!token || !newRole || newRole === user.role) {
        return;
      }

      if (user.id === currentAdminId && newRole !== ROLE_PROGRAMMER_ADMIN) {
        const confirmed = window.confirm(
          "You are about to remove Programmer(Admin) access from your own account. Continue?"
        );
        if (!confirmed) {
          return;
        }
      }

      setRoleUpdatingId(user.id);
      setFeedback(null);

      try {
        const response = await updateAdminUserRole({
          userId: user.id,
          role: newRole,
          token,
        });
        const updatedUser = response?.admin
          ? formatApiUser(response.admin)
          : {
              ...user,
              role: newRole,
              roleLabel: roleLabelMap[newRole] || newRole,
            };

        setUsers((prev) =>
          prev.map((item) => (item.id === user.id ? { ...item, ...updatedUser } : item))
        );
        setFeedback({
          type: "success",
          message: response?.message || "Role updated successfully.",
        });
      } catch (err) {
        setFeedback({
          type: "danger",
          message: err.message || "Unable to update role.",
        });
      } finally {
        setRoleUpdatingId(null);
      }
    },
    [token, currentAdminId]
  );

  return (
    <div className='card h-100 p-0 radius-12'>
      <div className='card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between'>
        <div className='d-flex align-items-center flex-wrap gap-3'>
          <span className='text-md fw-medium text-secondary-light mb-0'>Show</span>
          <select className='form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px' value='all' disabled>
            <option value='all'>All</option>
          </select>
          <form className='navbar-search' onSubmit={(event) => event.preventDefault()}>
            <input
              type='text'
              className='bg-base h-40-px w-auto'
              name='search'
              placeholder='Search by name or email'
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
            <Icon icon='ion:search-outline' className='icon' />
          </form>
          <select
            className='form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px'
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value='all'>All Statuses</option>
            <option value='active'>Active</option>
            <option value='inactive'>Inactive</option>
          </select>
        </div>
      </div>
      <div className='card-body p-24'>
        {feedback && (
          <div
            className={`alert alert-${feedback.type === "success" ? "success" : "danger"} py-12 px-16 mb-16`}
            role='alert'
          >
            {feedback.message}
          </div>
        )}

        {error && (
          <div className='alert alert-danger py-12 px-16 mb-16' role='alert'>
            {error}
          </div>
        )}

        <div className='table-responsive scroll-sm'>
          <table className='table bordered-table sm-table mb-0'>
            <thead>
              <tr>
                <th scope='col'>S.L</th>
                <th scope='col'>Name</th>
                <th scope='col'>Status</th>
                <th scope='col'>Current Role</th>
                <th scope='col' className='text-center'>Assign Role</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className='text-center py-32'>
                    <span className='d-inline-flex align-items-center gap-2'>
                      <Icon icon='line-md:loading-twotone-loop' className='text-lg' />
                      Loading admin users...
                    </span>
                  </td>
                </tr>
              ) : visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className='text-center py-32 text-secondary-light'>
                    No admin users match your filters.
                  </td>
                </tr>
              ) : (
                visibleUsers.map((user, index) => {
                  const serial = String(index + 1).padStart(2, "0");
                  const initials = getInitials(user.fullName);
                  const statusKey = user.status === "inactive" ? "inactive" : "active";
                  const statusMeta = statusStyles[statusKey];
                  const isUpdating = roleUpdatingId === user.id;

                  return (
                    <tr key={user.id}>
                      <td>{serial}</td>
                      <td>
                        <div className='d-flex align-items-center'>
                          <div className='w-40-px h-40-px rounded-circle bg-primary-100 text-primary-700 fw-semibold d-flex align-items-center justify-content-center flex-shrink-0 me-12'>
                            {initials}
                          </div>
                          <div className='flex-grow-1'>
                            <span className='text-md mb-2 fw-semibold text-secondary d-block'>
                              {user.fullName}
                            </span>
                            <span className='text-sm text-secondary-light d-block'>{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={statusMeta.className}>{statusMeta.label}</span>
                      </td>
                      <td>
                        <span className='badge bg-primary-50 text-primary-700 border border-primary-100 px-16 py-8 radius-8 fw-semibold text-sm'>
                          {user.roleLabel}
                        </span>
                      </td>
                      <td className='text-center'>
                        <select
                          className='form-select form-select-sm w-auto d-inline-block'
                          value={user.role}
                          onChange={(event) => handleRoleChange(user, event.target.value)}
                          disabled={isUpdating}
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {isUpdating && (
                          <span className='text-secondary-light text-sm ms-8 align-middle'>
                            Updating...
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className='d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24'>
          <span>
            Showing {visibleUsers.length} {visibleUsers.length === 1 ? "entry" : "entries"}
          </span>
          <ul className='pagination d-flex flex-wrap align-items-center gap-2 justify-content-center'>
            <li className='page-item'>
              <button
                type='button'
                className='page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px text-md'
                disabled
              >
                <Icon icon='ep:d-arrow-left' />
              </button>
            </li>
            <li className='page-item'>
              <span className='page-link text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md bg-primary-600 text-white'>
                1
              </span>
            </li>
            <li className='page-item'>
              <button
                type='button'
                className='page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px text-md'
                disabled
              >
                <Icon icon='ep:d-arrow-right' />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AssignRoleLayer;
