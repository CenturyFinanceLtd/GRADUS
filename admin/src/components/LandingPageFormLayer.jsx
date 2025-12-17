import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const LandingPageFormLayer = ({ slug }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const isEdit = !!slug;

    const { register, control, handleSubmit, setValue, reset, formState: { errors } } = useForm({
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
            axios.get(`/api/landing-pages/${slug}`)
                .then(res => {
                    const data = res.data;
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
                    console.error(err);
                    toast.error('Failed to load data');
                    setLoading(false);
                });
        }
    }, [slug, isEdit, reset]);

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
                await axios.put(`/api/landing-pages/${data._id}`, data);
                toast.success('Landing Page updated successfully');
            } else {
                await axios.post('/api/landing-pages', data);
                toast.success('Landing Page created successfully');
            }
            navigate('/landing-pages');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Something went wrong');
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
                                <input {...register('hero.date')} className="form-control" />
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
                                <label className="form-label">Hero Image URL</label>
                                <input {...register('hero.image')} className="form-control" />
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
                                <label className="form-label">Mentor Image URL</label>
                                <input {...register('mentor.image')} className="form-control" />
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
                                <label className="form-label">Certificate Image URL</label>
                                <input {...register('certificate.image')} className="form-control" />
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
