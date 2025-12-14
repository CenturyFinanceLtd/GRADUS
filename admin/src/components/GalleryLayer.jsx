import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import apiClient from "../services/apiClient";

const GalleryLayer = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [uploading, setUploading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await apiClient("/admin/gallery");
      setItems(response.items || []);
    } catch (error) {
      console.error("Error fetching gallery items:", error);
      toast.error("Failed to load gallery items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    try {
      await apiClient(`/admin/gallery/${id}`, { method: "DELETE" });
      toast.success("Image deleted successfully");
      setItems(items.filter((item) => item._id !== id));
    } catch (error) {
      toast.error("Failed to delete image");
    }
  };

  const onSubmit = async (data) => {
    try {
      setUploading(true);

      let imageUrl = data.imageUrl;
      let publicId = "";

      // Handle file upload if present
      if (data.image && data.image[0]) {
        const formData = new FormData();
        formData.append("file", data.image[0]);

        const uploadRes = await apiClient("/admin/uploads/image", {
          method: "POST",
          data: formData,
        });

        if (uploadRes.item) {
          imageUrl = uploadRes.item.url;
          publicId = uploadRes.item.publicId;
        }
      }

      if (!imageUrl) {
        toast.error("Please provide an image URL or upload a file");
        setUploading(false);
        return;
      }

      await apiClient("/admin/gallery", {
        method: "POST",
        data: {
          title: data.title,
          category: data.category,
          imageUrl,
          publicId
        }
      });

      toast.success("Gallery item added successfully");
      reset();
      setShowAddForm(false);
      fetchItems();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add gallery item");
    } finally {
      setUploading(false);
    }
  };

  const categories = ["Team", "University", "Tutors", "Events", "Other"];

  const filteredItems = activeTab === "All"
    ? items
    : items.filter(item => item.category === activeTab);

  return (
    <div className='card h-100 p-0 radius-12 overflow-hidden'>
      <div className='card-header border-bottom-0 pb-0 pt-0 px-0'>
        <div className="d-flex justify-content-between align-items-center p-24 pb-0">
          <ul
            className='nav border-gradient-tab nav-pills mb-0 border-top-0 gap-2'
            id='pills-tab'
            role='tablist'
          >
            <li className='nav-item'>
              <button
                className={`nav-link ${activeTab === "All" ? "active" : ""}`}
                onClick={() => setActiveTab("All")}
                type='button'
              >
                All
              </button>
            </li>
            {categories.map(cat => (
              <li className='nav-item' key={cat}>
                <button
                  className={`nav-link ${activeTab === cat ? "active" : ""}`}
                  onClick={() => setActiveTab(cat)}
                  type='button'
                >
                  {cat}
                </button>
              </li>
            ))}
          </ul>
          <button
            className="btn btn-primary-600 radius-8 px-20 py-11"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? "Cancel" : "Add New Image"}
          </button>
        </div>
      </div>

      <div className='card-body p-24'>
        {showAddForm && (
          <div className="mb-40 border p-24 radius-12 bg-neutral-50" style={{ maxWidth: '600px' }}>
            <h5 className="mb-20">Add New Gallery Image</h5>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="mb-16">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Title</label>
                <input
                  type="text"
                  className="form-control radius-8"
                  placeholder="Image Title"
                  {...register("title")}
                />
              </div>
              <div className="mb-16">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Category</label>
                <select className="form-control radius-8 form-select" {...register("category", { required: true })}>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="mb-16">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">Upload Image</label>
                <input
                  type="file"
                  className="form-control radius-8"
                  accept="image/*"
                  {...register("image")}
                />
              </div>
              <div className="mb-24">
                <label className="form-label fw-semibold text-primary-light text-sm mb-8">OR Image URL</label>
                <input
                  type="text"
                  className="form-control radius-8"
                  placeholder="https://..."
                  {...register("imageUrl")}
                />
              </div>
              <button type="submit" className="btn btn-primary-600 radius-8 px-20 py-11" disabled={uploading}>
                {uploading ? "Uploading..." : "Save Image"}
              </button>
            </form>
          </div>
        )}

        <div className='tab-content'>
          <div className='row gy-4'>
            {loading ? (
              <div>Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div>No images found.</div>
            ) : (
              filteredItems.map((item) => (
                <div className='col-xxl-3 col-md-4 col-sm-6' key={item._id}>
                  <div className='hover-scale-img border radius-16 overflow-hidden position-relative group'>
                    <div className='max-h-266-px overflow-hidden'>
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className='hover-scale-img__img w-100 h-100 object-fit-cover'
                        style={{ aspectRatio: '1/1' }}
                      />
                    </div>
                    <div className='py-16 px-24 d-flex justify-content-between align-items-center'>
                      <div>
                        <h6 className='mb-4 text-line-1'>{item.title || "Untitled"}</h6>
                        <p className='mb-0 text-sm text-secondary-light'>
                          {item.category}
                        </p>
                      </div>
                      <button
                        className="btn btn-danger-600 radius-8 px-12 py-6 text-sm"
                        onClick={() => handleDelete(item._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GalleryLayer;
