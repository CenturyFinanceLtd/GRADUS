import { useState, useEffect } from "react";
import assignmentService from "../services/assignmentService";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";


const CourseAssignments = ({ courseSlug, locked = false }) => {
    const { token } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAssignment, setSelectedAssignment] = useState(null);

    // Submission Form State
    const [content, setContent] = useState("");
    const [attachmentUrl, setAttachmentUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (courseSlug && token && !locked) {
            loadAssignments();
        }
    }, [courseSlug, token, locked]);

    const loadAssignments = async () => {
        try {
            setLoading(true);
            const items = await assignmentService.listForCourse({ courseSlug, token });
            setAssignments(items);
        } catch (error) {
            if (error?.response?.status === 403 || error?.status === 403) {
                // Not enrolled - silence error
                setAssignments([]);
            } else {
                console.error("Failed to load assignments", error);
                toast.error("Could not load assignments.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOpenSubmit = (assignment) => {
        setSelectedAssignment(assignment);
        setContent("");
        setAttachmentUrl("");
    };

    const handleCloseModal = () => {
        setSelectedAssignment(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() && !attachmentUrl.trim()) {
            toast.warn("Please add some content or a link.");
            return;
        }

        try {
            setSubmitting(true);
            await assignmentService.submit({
                assignmentId: selectedAssignment.id || selectedAssignment._id,
                content,
                attachmentUrl,
                token
            });
            toast.success("Assignment submitted successfully!");
            handleCloseModal();
            loadAssignments(); // Refresh list to show status
        } catch (error) {
            console.error(error);
            toast.error("Failed to submit assignment.");
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "No Due Date";
        return new Date(dateString).toLocaleDateString();
    };

    if (locked) {
        return (
            <div className="p-40 rounded-16 border border-neutral-30 bg-neutral-10 text-center">
                <div className="w-80 h-80 rounded-circle bg-neutral-30 flex-center mx-auto mb-24 text-neutral-400">
                    <i className="ph ph-lock-key text-4xl"></i>
                </div>
                <h4 className="mb-12">Assignments Locked</h4>
                <p className="text-neutral-500 mb-0 max-w-400 mx-auto">
                    Please complete all course lectures to unlock the assignments section.
                </p>
            </div>
        );
    }

    if (loading) return <div className="p-4 text-center">Loading assignments...</div>;

    if (assignments.length === 0) {
        return (
            <div className="p-4 rounded-12 border border-neutral-30 bg-main-25 text-center">
                <h5 className="mb-0 text-neutral-500">No assignments for this course.</h5>
            </div>
        );
    }

    return (
        <div className="assignments-container">
            <div className="d-flex flex-column gap-24">
                {assignments.map((assignment) => {
                    const submission = assignment.submission;
                    const status = submission ? submission.status : "pending";
                    const statusColor = status === "pending" ? "text-warning-600 bg-warning-50" :
                        status === "submitted" ? "text-info-600 bg-info-50" :
                            "text-success-600 bg-success-50";

                    return (
                        <div key={assignment._id || assignment.id} className="assignment-card border border-neutral-30 rounded-12 p-32 bg-white">
                            <div className="flex-between flex-wrap gap-16 mb-16">
                                <h5 className="mb-0 text-main-600">{assignment.title}</h5>
                                <span className={`px-12 py-4 rounded-pill text-sm fw-medium ${statusColor}`}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </span>
                            </div>

                            <p className="text-neutral-700 mb-20">{assignment.description}</p>

                            <div className="flex-align gap-24 text-neutral-500 text-sm mb-24">
                                <span className="flex-align gap-8">
                                    <i className="ph-bold ph-calendar-blank" />
                                    Due: {formatDate(assignment.dueDate)}
                                </span>
                                <span className="flex-align gap-8">
                                    <i className="ph-bold ph-star" />
                                    Points: {assignment.maxPoints}
                                </span>
                            </div>

                            {submission ? (
                                <div className="submission-status p-16 bg-main-25 rounded-8">
                                    <h6 className="text-md mb-8 fw-semibold">Your Submission</h6>
                                    <p className="text-neutral-600 text-sm mb-8">{submission.content}</p>
                                    {submission.attachmentUrl && (
                                        <a href={submission.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-main-600 text-sm hover-text-decoration-underline mb-8 d-block">
                                            <i className="ph-bold ph-link" /> View Attachment
                                        </a>
                                    )}
                                    <p className="text-xs text-neutral-400">Submitted on {new Date(submission.submittedAt).toLocaleDateString()}</p>

                                    {submission.grade && (
                                        <div className="mt-12 pt-12 border-top border-neutral-100">
                                            <span className="fw-bold text-main-600">Grade: {submission.grade} / {assignment.maxPoints}</span>
                                            {submission.feedback && <p className="text-sm text-neutral-600 mt-4">Feedback: {submission.feedback}</p>}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    className="btn btn-main rounded-pill py-12 px-24"
                                    onClick={() => handleOpenSubmit(assignment)}
                                >
                                    Submit Assignment
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Submission Modal Overlay - Simple Implementation */}
            {selectedAssignment && (
                <div className="modal-overlay position-fixed top-0 start-0 w-100 h-100 d-flex flex-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                    <div className="modal-content bg-white rounded-16 p-32 w-100 max-w-600 position-relative mx-16">
                        <button onClick={handleCloseModal} className="position-absolute top-0 end-0 m-24 text-neutral-500 hover-text-danger-600">
                            <i className="ph-bold ph-x text-2xl" />
                        </button>

                        <h4 className="mb-24">Submit: {selectedAssignment.title}</h4>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-24">
                                <label className="text-neutral-700 fw-medium mb-8">Response / Answer</label>
                                <textarea
                                    className="common-input rounded-8 bg-main-25 h-120"
                                    placeholder="Type your answer here..."
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    required={!attachmentUrl}
                                ></textarea>
                            </div>

                            <div className="mb-32">
                                <label className="text-neutral-700 fw-medium mb-8">Attachment URL (Optional)</label>
                                <input
                                    type="url"
                                    className="common-input rounded-pill bg-main-25"
                                    placeholder="https://drive.google.com/..."
                                    value={attachmentUrl}
                                    onChange={(e) => setAttachmentUrl(e.target.value)}
                                />
                                <small className="text-neutral-500 mt-4 d-block">Paste a link to your Google Drive, Dropbox, or GitHub file.</small>
                            </div>

                            <div className="flex-align gap-16 justify-content-end">
                                <button type="button" onClick={handleCloseModal} className="btn btn-outline-neutral rounded-pill py-12 px-32">Cancel</button>
                                <button type="submit" className="btn btn-main rounded-pill py-12 px-32" disabled={submitting}>
                                    {submitting ? 'Submitting...' : 'Submit Assignment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseAssignments;
