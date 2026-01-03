import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../assets/DatePickerOverrides.css"; // Theme overrides
import apiClient from '../services/apiClient';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { uploadToSupabase } from '../services/uploads';

const LandingPageFormLayer = ({ slug }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploadingHero, setUploadingHero] = useState(false);
    const [uploadingMentor, setUploadingMentor] = useState(false);
    const [uploadingCertificate, setUploadingCertificate] = useState(false);
    const isEdit = !!slug;
    const { token } = useAuthContext();

    const { register, control, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm({
        defaultValues: {
            slug: '',
            hero: { socialProofCount: '12K+', ratingText: '5k+ reviews (4.9 of 5)' },
            middleSection: {
                targetAudience: [{ icon: '✨', text: '' }],
                learningCards: [{ number: '1', text: '' }],
            },
            mentor: { points: [''] },
            faq: [{ question: '', answer: '' }],
            stickyFooter: { priceOriginal: '1999', priceCurrent: 'FREE' }
        }
    });

    // Field Arrays for dynamic lists
    const { fields: audienceFields, append: appendAudience, remove: removeAudience } = useFieldArray({
        control,
        name: "middleSection.targetAudience"
    });

    const { fields: learningFields, append: appendLearning, remove: removeLearning } = useFieldArray({
        control,
        name: "middleSection.learningCards"
    });

    const { fields: mentorPointsFields, append: appendMentorPoint, remove: removeMentorPoint } = useFieldArray({
        control,
        name: "mentor.points" // Mongoose expects array of strings, but rhf needs objects. We might need to transform.
        // Actually, let's treat mentor.points as object { value: string } in form and transform on submit?
        // Simpler: just use index access if array of strings is hard in rhf v7 without objects.
        // Let's use objects { val: string } in form state, and map to strings on submit.
    });
    // Wait, useFieldArray requires objects with 'id'.
    // So for mentor.points (which is [String] in backend), I need to manage it.
    // Let's stick to standard RHF field array behavior where objects are preferred.

    const { fields: faqFields, append: appendFaq, remove: removeFaq } = useFieldArray({
        control,
        name: "faq"
    });


    useEffect(() => {
        if (isEdit && slug) {
            setLoading(true);
            apiClient(`/admin/landing-pages/${slug}`, { token })
                .then(data => {
                    // Transform flat arrays to object arrays for RHF if needed
                    // mentor.points: ["a", "b"] -> [{val: "a"}, {val: "b"}]
                    if (data.mentor && data.mentor.points) {
                        data.mentor.points = data.mentor.points.map(p => ({ val: p }));
                    } else if (!data.mentor) {
                        data.mentor = { points: [] };
                    }
                    reset(data);
                    setLoading(false);
                })
                .catch(err => {
                    // Start fresh if not found
                    if (err.status === 404) {
                        toast.info('Landing page not found, creating new.');
                        setLoading(false);
                        return;
                    }
                    console.error(err);
                    toast.error('Failed to load data');
                    setLoading(false);
                });
        }
    }, [slug, isEdit, reset]);

    const handleHeroImageUpload = async (file) => {
        if (!file) return;
        try {
            setUploadingHero(true);
            const uploaded = await uploadToSupabase({ file, token });
            setValue('hero.image', uploaded.url);
            toast.success('Hero image uploaded successfully');
        } catch (err) {
            toast.error(err?.message || 'Image upload failed');
        } finally {
            setUploadingHero(false);
        }
    };

    const handleMentorImageUpload = async (file) => {
        if (!file) return;
        try {
            setUploadingMentor(true);
            const uploaded = await uploadToSupabase({ file, token });
            setValue('mentor.image', uploaded.url);
            toast.success('Mentor image uploaded successfully');
        } catch (err) {
            toast.error(err?.message || 'Image upload failed');
        } finally {
            setUploadingMentor(false);
        }
    };

    const handleCertificateImageUpload = async (file) => {
        if (!file) return;
        try {
            setUploadingCertificate(true);
            const uploaded = await uploadToSupabase({ file, token });
            setValue('certificate.image', uploaded.url);
            toast.success('Certificate image uploaded successfully');
        } catch (err) {
            toast.error(err?.message || 'Image upload failed');
        } finally {
            setUploadingCertificate(false);
        }
    };

    const onSubmit = async (data) => {
        try {
            setLoading(true);
            // Transform back mentor points
            if (data.mentor && data.mentor.points) {
                data.mentor.points = data.mentor.points.map(p => p.val);
            }

            if (isEdit) {
                // We need ID for update, but we fetched by slug.
                // The data object from reset(res.data) should contain _id.
                await apiClient(`/admin/landing-pages/${data._id}`, { method: 'PUT', data, token });
                toast.success('Landing Page updated successfully');
            } else {
                await apiClient('/admin/landing-pages', { method: 'POST', data, token });
                toast.success('Landing Page created successfully');
            }
            navigate('/landing-pages');
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEdit) return <div>Loading...</div>;

    return (
        <section className="landing-page-form-layer">
            <div className="card h-100 p-0 radius-12">
                <div className="card-header border-bottom bg-base py-16 px-24">
                    <h6 className="text-lg fw-semibold mb-0">{isEdit ? 'Edit' : 'Create'} Landing Page</h6>
                </div>
                <div className="card-body p-24">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="row">
                            <h5 className="mb-3">General</h5>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Page Title</label>
                                <input {...register('title')} className="form-control" placeholder="Internal or Page Title" />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">URL Slug (e.g., 'akhil')</label>
                                <input {...register('slug', { required: true })} className="form-control" readOnly={isEdit} />
                                {errors.slug && <span className="text-danger">Slug is required</span>}
                            </div>
                        </div>

                        <hr />
                        <h5 className="mb-3">Hero Section</h5>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Title Prefix (e.g. Masterclass on)</label>
                                <input {...register('hero.titlePrefix')} className="form-control" />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Highlight Text</label>
                                <input {...register('hero.highlight')} className="form-control" />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Mentor Name (in Hero)</label>
                                <input {...register('hero.mentorName')} className="form-control" />
                            </div>
                            <div className="col-md-12 mb-3">
                                <label className="form-label">Subtitle</label>
                                <textarea {...register('hero.subtitle')} className="form-control" rows="2" />
                            </div>
                            <div className="col-md-3 mb-3">
                                <label className="form-label">Date</label>
                                <Controller
                                    control={control}
                                    name="hero.date"
                                    render={({ field }) => (
                                        <DatePicker
                                            className="form-control"
                                            placeholderText="e.g. 18 December 2025"
                                            selected={field.value ? new Date(field.value) : null}
                                            onChange={(date) => {
                                                // Format: 18 December 2025
                                                const formatted = date ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date) : '';
                                                field.onChange(formatted);
                                            }}
                                            dateFormat="d MMMM yyyy"
                                        />
                                    )}
                                />
                            </div>
                            <div className="col-md-3 mb-3">
                                <label className="form-label">Time</label>
                                <input {...register('hero.time')} className="form-control" />
                            </div>
                            <div className="col-md-3 mb-3">
                                <label className="form-label">Language</label>
                                <input {...register('hero.language')} className="form-control" />
                            </div>
                            <div className="col-md-3 mb-3">
                                <label className="form-label">Duration</label>
                                <input {...register('hero.duration')} className="form-control" />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Hero Image</label>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="flex-grow-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="form-control"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    handleHeroImageUpload(file);
                                                }
                                                e.target.value = "";
                                            }}
                                            disabled={uploadingHero}
                                        />
                                        <small className="text-muted">Recommended: landscape image (max 5MB)</small>
                                    </div>
                                    {watch('hero.image') && (
                                        <div className="border rounded p-2 bg-light-subtle">
                                            <img
                                                src={watch('hero.image')}
                                                alt="Hero preview"
                                                style={{ maxWidth: 100, maxHeight: 100, objectFit: "cover", display: "block", borderRadius: 8 }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <input {...register('hero.image')} className="form-control mt-2" placeholder="Or enter image URL manually" />
                            </div>
                            <div className="col-md-12 mb-3">
                                <label className="form-label">Bottom Info Bar Text</label>
                                <textarea {...register('hero.bottomInfo')} className="form-control" rows="2" />
                            </div>
                        </div>

                        <hr />
                        <h5 className="mb-3">Middle Section</h5>
                        <div className="row">
                            <div className="col-md-12 mb-3">
                                <label className="form-label">Program Name (e.g. Gradus TECH)</label>
                                <input {...register('middleSection.programName')} className="form-control" />
                            </div>

                            <div className="col-12 mb-3">
                                <label className="form-label">Target Audience Cards</label>
                                {audienceFields.map((field, index) => (
                                    <div key={field.id} className="d-flex gap-2 mb-2">
                                        <input {...register(`middleSection.targetAudience.${index}.icon`)} className="form-control w-auto" placeholder="Icon (Emoji)" />
                                        <input {...register(`middleSection.targetAudience.${index}.text`)} className="form-control" placeholder="Description" />
                                        <button type="button" className="btn btn-danger-600 btn-sm" onClick={() => removeAudience(index)}>X</button>
                                    </div>
                                ))}
                                <button type="button" className="btn btn-primary-50 text-primary-600" onClick={() => appendAudience({ icon: '✨', text: '' })}>+ Add Audience</button>
                            </div>

                            <div className="col-12 mb-3">
                                <label className="form-label">Learning Cards</label>
                                {learningFields.map((field, index) => (
                                    <div key={field.id} className="d-flex gap-2 mb-2">
                                        <input {...register(`middleSection.learningCards.${index}.text`)} className="form-control" placeholder="Learning Point" />
                                        <button type="button" className="btn btn-danger-600 btn-sm" onClick={() => removeLearning(index)}>X</button>
                                    </div>
                                ))}
                                <button type="button" className="btn btn-primary-50 text-primary-600" onClick={() => appendLearning({ number: '', text: '' })}>+ Add Card</button>
                            </div>
                            <div className="col-md-12 mb-3">
                                <label className="form-label">Centered Final Card Text</label>
                                <textarea {...register('middleSection.centeredCard')} className="form-control" />
                            </div>
                        </div>

                        <hr />
                        <h5 className="mb-3">Mentor Section</h5>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Mentor Name</label>
                                <input {...register('mentor.name')} className="form-control" />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Mentor Image</label>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="flex-grow-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="form-control"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    handleMentorImageUpload(file);
                                                }
                                                e.target.value = "";
                                            }}
                                            disabled={uploadingMentor}
                                        />
                                        <small className="text-muted">Recommended: square image (max 5MB)</small>
                                    </div>
                                    {watch('mentor.image') && (
                                        <div className="border rounded p-2 bg-light-subtle">
                                            <img
                                                src={watch('mentor.image')}
                                                alt="Mentor preview"
                                                style={{ maxWidth: 64, maxHeight: 64, objectFit: "cover", display: "block", borderRadius: 8 }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <input {...register('mentor.image')} className="form-control mt-2" placeholder="Or enter image URL manually" />
                            </div>
                            <div className="col-12 mb-3">
                                <label className="form-label">Mentor Points</label>
                                {mentorPointsFields.map((field, index) => (
                                    <div key={field.id} className="d-flex gap-2 mb-2">
                                        <input {...register(`mentor.points.${index}.val`)} className="form-control" />
                                        <button type="button" className="btn btn-danger-600 btn-sm" onClick={() => removeMentorPoint(index)}>X</button>
                                    </div>
                                ))}
                                <button type="button" className="btn btn-primary-50 text-primary-600" onClick={() => appendMentorPoint({ val: '' })}>+ Add Point</button>
                            </div>
                        </div>

                        <hr />
                        <h5 className="mb-3">FAQ & Footer</h5>
                        <div className="col-12 mb-3">
                            <label className="form-label">FAQs</label>
                            {faqFields.map((field, index) => (
                                <div key={field.id} className="row g-2 mb-3 border p-2 radius-8">
                                    <div className="col-12">
                                        <input {...register(`faq.${index}.question`)} className="form-control" placeholder="Question" />
                                    </div>
                                    <div className="col-12">
                                        <textarea {...register(`faq.${index}.answer`)} className="form-control" placeholder="Answer" rows="2" />
                                    </div>
                                    <div className="col-12 text-end">
                                        <button type="button" className="btn btn-danger-600 btn-sm" onClick={() => removeFaq(index)}>Remove FAQ</button>
                                    </div>
                                </div>
                            ))}
                            <button type="button" className="btn btn-primary-50 text-primary-600" onClick={() => appendFaq({ question: '', answer: '' })}>+ Add FAQ</button>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Certificate Headline</label>
                                <input {...register('certificate.headline')} className="form-control" />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Certificate Image</label>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="flex-grow-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="form-control"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    handleCertificateImageUpload(file);
                                                }
                                                e.target.value = "";
                                            }}
                                            disabled={uploadingCertificate}
                                        />
                                        <small className="text-muted">Recommended: landscape image (max 5MB)</small>
                                    </div>
                                    {watch('certificate.image') && (
                                        <div className="border rounded p-2 bg-light-subtle">
                                            <img
                                                src={watch('certificate.image')}
                                                alt="Certificate preview"
                                                style={{ maxWidth: 100, maxHeight: 100, objectFit: "cover", display: "block", borderRadius: 8 }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <input {...register('certificate.image')} className="form-control mt-2" placeholder="Or enter image URL manually" />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Original Price</label>
                                <input {...register('stickyFooter.priceOriginal')} className="form-control" />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Current Price</label>
                                <input {...register('stickyFooter.priceCurrent')} className="form-control" />
                            </div>
                        </div>

                        <div className="mt-4">
                            <button type="submit" className="btn btn-primary-600 radius-8 px-24 py-12" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Landing Page'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
};

export default LandingPageFormLayer;
