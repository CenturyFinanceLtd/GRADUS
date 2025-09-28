import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link } from "react-router-dom";
import useAuth from "../hook/useAuth";
import {
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUserStatus,
} from "../services/adminUsers";

const ROLE_PROGRAMMER_ADMIN = "programmer_admin";
const ROLE_ADMIN = "admin";
const ROLE_SEO = "seo";
const ROLE_SALES = "sales";

const roleLabelMap = {
  [ROLE_PROGRAMMER_ADMIN]: "Programmer(Admin)",
  [ROLE_ADMIN]: "Admin",
  [ROLE_SEO]: "SEO",
  [ROLE_SALES]: "Sales",
};

const normalizeRole = (role) => (role ? String(role).toLowerCase() : "");

const formatJoinDate = (value) => {
  if (!value) {
    return "�";
  }
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "�";
  }
};

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
  ...user,
  id: user.id || user._id,
  role: normalizeRole(user.role),
  roleLabel: user.roleLabel || roleLabelMap[normalizeRole(user.role)] || "Unknown",
  status: user.status || "active",
});

const UsersListLayer = () => {
  const { token, admin } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const currentRole = normalizeRole(admin?.role);
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

  const canManageUser = useCallback(
    (user) => {
      if (!user || !currentRole) {
        return false;
      }

      const targetRole = normalizeRole(user.role);

      if (currentAdminId && (user.id === currentAdminId || user._id === currentAdminId)) {
        return false;
      }

      if (targetRole === ROLE_PROGRAMMER_ADMIN) {
        return currentRole === ROLE_PROGRAMMER_ADMIN;
      }

      if (currentRole === ROLE_PROGRAMMER_ADMIN) {
        return true;
      }

      if (currentRole === ROLE_ADMIN) {
        return targetRole !== ROLE_PROGRAMMER_ADMIN;
      }

      return false;
    },
    [currentRole, currentAdminId]
  );

  const handleStatusToggle = useCallback(
    async (user) => {
      if (!token || !canManageUser(user)) {
        return;
      }

      const nextStatus = user.status === "active" ? "inactive" : "active";
      setStatusUpdatingId(user.id);
      setFeedback(null);

      try {
        const response = await updateAdminUserStatus({
          userId: user.id,
          status: nextStatus,
          token,
        });

        const updatedUser = response?.admin
          ? formatApiUser(response.admin)
          : { ...user, status: nextStatus };

        setUsers((prev) =>
          prev.map((item) => (item.id === user.id ? { ...item, ...updatedUser } : item))
        );
        setFeedback({ type: "success", message: response?.message || "Status updated." });
      } catch (err) {
        setFeedback({ type: "danger", message: err.message || "Unable to update status." });
      } finally {
        setStatusUpdatingId(null);
      }
    },
    [token, canManageUser]
  );

  const handleDelete = useCallback(
    async (user) => {
      if (!token || !canManageUser(user)) {
        return;
      }

      const confirmed = window.confirm(
        `Remove ${user.fullName || "this admin"}? This action cannot be undone.`
      );

      if (!confirmed) {
        return;
      }

      setDeletingId(user.id);
      setFeedback(null);

      try {
        const response = await deleteAdminUser({ userId: user.id, token });
        setUsers((prev) => prev.filter((item) => item.id !== user.id));
        setFeedback({ type: "success", message: response?.message || "Admin removed." });
      } catch (err) {
        setFeedback({ type: "danger", message: err.message || "Unable to remove admin." });
      } finally {
        setDeletingId(null);
      }
    },
    [token, canManageUser]
  );

  const visibleUsers = useMemo(() => users, [users]);

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
              placeholder='Search by name, email, department'
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
        <Link
          to='/add-user'
          className='btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2'
        >
          <Icon icon='ic:baseline-plus' className='icon text-xl line-height-1' />
          Add New User
        </Link>
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
                <th scope='col'>
                  <div className='d-flex align-items-center gap-10'>
                    <div className='form-check style-check d-flex align-items-center'>
                      <input
                        className='form-check-input radius-4 border input-form-dark'
                        type='checkbox'
                        name='checkbox'
                        disabled
                      />
                    </div>
                    S.L
                  </div>
                </th>
                <th scope='col'>Join Date</th>
                <th scope='col'>Name</th>
                <th scope='col'>Email</th>
                <th scope='col'>Department</th>
                <th scope='col'>Designation</th>
                <th scope='col'>Role</th>
                <th scope='col' className='text-center'>Status</th>
                <th scope='col' className='text-center'>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className='text-center py-32'>
                    <span className='d-inline-flex align-items-center gap-2'>
                      <Icon icon='line-md:loading-twotone-loop' className='text-lg' />
                      Loading users...
                    </span>
                  </td>
                </tr>
              ) : visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className='text-center py-32 text-secondary-light'>
                    No admin users match your filters.
                  </td>
                </tr>
              ) : (
                visibleUsers.map((user, index) => {
                  const serial = String(index + 1).padStart(2, "0");
                  const initials = getInitials(user.fullName);
                  const statusKey = user.status === "inactive" ? "inactive" : "active";
                  const statusMeta = statusStyles[statusKey];
                  const canManage = canManageUser(user);
                  const isUpdatingStatus = statusUpdatingId === user.id;
                  const isDeleting = deletingId === user.id;

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className='d-flex align-items-center gap-10'>
                          <div className='form-check style-check d-flex align-items-center'>
                            <input
                              className='form-check-input radius-4 border border-neutral-400'
                              type='checkbox'
                              name='checkbox'
                              disabled
                            />
                          </div>
                          {serial}
                        </div>
                      </td>
                      <td>{formatJoinDate(user.createdAt)}</td>
                      <td>
                        <div className='d-flex align-items-center'>
                          <div className='w-40-px h-40-px rounded-circle bg-primary-100 text-primary-700 fw-semibold d-flex align-items-center justify-content-center flex-shrink-0 me-12'>
                            {initials}
                          </div>
                          <div className='flex-grow-1'>
                            <span className='text-md mb-0 fw-semibold text-secondary'>{user.fullName}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className='text-md mb-0 fw-normal text-secondary-light'>{user.email}</span>
                      </td>
                      <td>{user.department || "�"}</td>
                      <td>{user.designation || "�"}</td>
                      <td>{user.roleLabel || roleLabelMap[user.role] || "�"}</td>
                      <td className='text-center'>
                        <button
                          type='button'
                          className={`${statusMeta.className} ${canManage ? "cursor-pointer" : "opacity-75"}`}
                          onClick={() => handleStatusToggle(user)}
                          disabled={!canManage || isUpdatingStatus}
                        >
                          {isUpdatingStatus ? "Updating..." : statusMeta.label}
                        </button>
                      </td>
                      <td className='text-center'>
                        <div className='d-flex align-items-center gap-10 justify-content-center'>
                          <button
                            type='button'
                            className='remove-item-btn bg-danger-focus bg-hover-danger-200 text-danger-600 fw-medium w-40-px h-40-px d-flex justify-content-center align-items-center rounded-circle'
                            onClick={() => handleDelete(user)}
                            disabled={!canManage || isDeleting}
                            title='Remove user'
                          >
                            {isDeleting ? (
                              <Icon icon='line-md:loading-twotone-loop' className='icon text-xl' />
                            ) : (
                              <Icon icon='fluent:delete-24-regular' className='menu-icon' />
                            )}
                          </button>
                        </div>
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

export default UsersListLayer;
