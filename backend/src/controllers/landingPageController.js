const LandingPage = require('../models/LandingPage');

const getAllLandingPages = async (req, res) => {
    try {
        const pages = await LandingPage.find().select('slug createdAt updatedAt');
        res.json(pages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getLandingPageBySlug = async (req, res) => {
    try {
        const page = await LandingPage.findOne({ slug: req.params.slug });
        if (!page) {
            return res.status(404).json({ message: 'Landing page not found' });
        }
        res.json(page);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createLandingPage = async (req, res) => {
    try {
        const newPage = new LandingPage(req.body);
        const savedPage = await newPage.save();
        res.status(201).json(savedPage);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateLandingPage = async (req, res) => {
    try {
        const updatedPage = await LandingPage.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!updatedPage) {
            return res.status(404).json({ message: 'Landing page not found' });
        }
        res.json(updatedPage);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteLandingPage = async (req, res) => {
    try {
        const page = await LandingPage.findByIdAndDelete(req.params.id);
        if (!page) {
            return res.status(404).json({ message: 'Landing page not found' });
        }
        res.json({ message: 'Landing page deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllLandingPages,
    getLandingPageBySlug,
    createLandingPage,
    updateLandingPage,
    deleteLandingPage,
};
