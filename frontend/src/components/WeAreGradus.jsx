import React from 'react';

const images = [
    '/assets/Gallery/left.png', // Left image
    '/assets/Gallery/middle.png', // Middle image
    '/assets/Gallery/right.png', // Right image
];

const WeAreGradus = () => {
    return (
        <section className="we-are-gradus py-120 bg-white overflow-hidden">
            <div className="container">
                <div className="section-heading text-center mb-64">
                    <h2 className="mb-12 wow bounceIn">We are the Gradus</h2>
                    <p className="text-neutral-500 wow bounceInUp">
                        Meet our masterminds who contribute their mind to Gradus
                    </p>
                </div>
            </div>

            <div className="gradus-static-wrapper">
                <div className="gradus-static-inner">
                    <div className="gradus-static-img left">
                        <img src={images[0]} alt="Gradus Team Left" />
                        <div className="overlay"></div>
                    </div>
                    <div className="gradus-static-img right">
                        <img src={images[2]} alt="Gradus Team Right" />
                        <div className="overlay"></div>
                    </div>
                    <div className="gradus-static-img center">
                        <img src={images[1]} alt="Gradus Team Center" />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WeAreGradus;
