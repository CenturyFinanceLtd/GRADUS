const WhyGradusVideo = require('../models/WhyGradusVideo');

const ensureSingleActive = async () => {
  const activeItems = await WhyGradusVideo.find({ active: true }).sort({ createdAt: -1 });
  if (activeItems.length <= 1) return;
  // Keep the most recent active, deactivate the rest
  const [keep, ...rest] = activeItems;
  await WhyGradusVideo.updateMany({ _id: { $in: rest.map((r) => r._id) } }, { $set: { active: false } });
  return keep;
};

module.exports = { ensureSingleActive };

