import React from 'react';

const teamMembers = [
    {
        name: 'Hrishant Ramesh Singh',
        role: 'Founder and CEO',
        image: 'https://placehold.co/300x350?text=Hrishant',
    },
    {
        name: 'Vaibhav Batra',
        role: 'Director Academics',
        image: 'https://placehold.co/300x350?text=Vaibhav',
    },
    {
        name: 'Deepak Kumar',
        role: 'Director Operations',
        image: 'https://placehold.co/300x350?text=Deepak',
    },
    {
        name: 'Nishant Singh',
        role: 'Senior Software Engineer',
        image: 'https://placehold.co/300x350?text=Nishant',
    },
    {
        name: 'Divyansh Vaish',
        role: 'Senior Software Engineer',
        image: 'https://placehold.co/300x350?text=Divyansh',
    },
    {
        name: 'Kunal Dalotra',
        role: 'Product Lead',
        image: 'https://placehold.co/300x350?text=Kunal',
    },
    {
        name: 'Sourav Saha',
        role: 'Head of Sales',
        image: 'https://placehold.co/300x350?text=Sourav',
    },
    {
        name: 'Ankit Gupta',
        role: 'SEO Manager',
        image: 'https://placehold.co/300x350?text=Ankit',
    },
    {
        name: 'Prakash Patel',
        role: 'Financial Market Expert',
        image: 'https://placehold.co/300x350?text=Prakash',
    },
    {
        name: 'Karan Khera',
        role: 'Financial Market Expert',
        image: 'https://placehold.co/300x350?text=Karan',
    },
    {
        name: 'Akhil Pandey',
        role: 'AI ML Expert',
        image: 'https://placehold.co/300x350?text=Akhil',
    },
    {
        name: 'Shreya Grovar',
        role: 'Human Resources',
        image: 'https://placehold.co/300x350?text=Shreya',
    },
];

const MeetOurTeam = () => {
    return (
        <section className="meet-our-team py-120 bg-white">
            <div className="container">
                <div className="section-heading text-center mb-64">
                    <p className="text-xl text-neutral-500 mb-12">
                        We bring a wealth of skills and experience from a wide range of backgrounds.
                    </p>
                    <h2 className="mb-0 text-neutral-900">Meet our Team</h2>
                </div>

                <div className="row g-4">
                    {teamMembers.map((member, index) => (
                        <div className="col-xl-3 col-lg-4 col-sm-6" key={index}>
                            <div className="team-item bg-white border border-neutral-30 rounded-16 p-12 h-100 transition-2 hover-shadow-lg hover-border-main-600">
                                <div className="rounded-12 overflow-hidden position-relative">
                                    <img
                                        src={member.image}
                                        alt={member.name}
                                        className="w-100 h-100 object-fit-cover rounded-12 transition-2"
                                        style={{ aspectRatio: '300/350' }}
                                    />
                                </div>
                                <div className="pt-24 pb-12 px-12">
                                    <h5 className="mb-8 text-neutral-900">{member.name}</h5>
                                    <p className="text-neutral-500 mb-0 text-sm">{member.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default MeetOurTeam;
