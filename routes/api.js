const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const requireAuth = require('../middleware/auth');
const Todo = require('../models/todo');
const Donation = require('../models/Donation');
const CollectionRequest = require('../models/CollectionRequest');

async function updateExpiredDonations() {
  await Donation.updateMany(
    {
      status: 'Available',
      expiryTime: { $lte: new Date() }
    },
    {
      $set: { status: 'Expired' }
    }
  );
}
function requireDonor(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Please log in to continue' });
  }

  if (req.session.user.role !== 'donor') {
    return res.status(403).json({ error: 'Only food donors can manage donations' });
  }

  next();
}

router.get('/todos', async (req, res) => {
  try {
    const todos = await Todo.find({}, 'action');
    return res.json(todos);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

router.post('/todos', async (req, res) => {
  try {
    const { action } = req.body;

    if (typeof action !== 'string' || !action.trim()) {
      return res.status(400).json({ error: 'The input field is empty' });
    }

    const todo = await Todo.create({ action: action.trim() });
    return res.status(201).json(todo);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create todo' });
  }
});

router.delete('/todos/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid todo ID' });
    }

    const todo = await Todo.findByIdAndDelete(req.params.id);

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    return res.json(todo);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete todo' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, password, role } = req.body;

    if (
      typeof fullName !== 'string' || !fullName.trim() ||
      typeof email !== 'string' || !email.trim() ||
      typeof phone !== 'string' || !phone.trim() ||
      typeof password !== 'string' || !password
    ) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must contain at least 6 characters' });
    }

    if (!['donor', 'ngo', 'volunteer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid user role' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: hashedPassword,
      role
    });

    return res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || !password
    ) {
      return res.status(400).json({ error: 'Please enter your email and password' });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select('+password');

    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!req.session) {
      return res.status(500).json({ error: 'Session middleware is not configured' });
    }
req.session.regenerate(error => {
  if (error) {
    return res.status(500).json({
      error: 'Unable to create a secure session'
    });
  }

  req.session.user = {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role
  };

  req.session.save(error => {
    if (error) {
      return res.status(500).json({
        error: 'Unable to complete login'
      });
    }

    return res.json({
      message: 'Login successful',
      user: req.session.user
    });
  });
});
  } catch (error) {
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.session.user
  });
});
router.post('/logout', (req, res) => {
  if (!req.session) {
    return res.json({ message: 'Logged out successfully' });
  }

  req.session.destroy(error => {
    if (error) {
      return res.status(500).json({
        error: 'Unable to log out'
      });
    }

    res.clearCookie('foodlink.sid');

    return res.json({
      message: 'Logged out successfully'
    });
  });
});
router.get('/donations', async (req, res) => {
  try {
    await updateExpiredDonations();

    const donations = await Donation.find().sort({ createdAt: -1 });

    return res.json(donations);
  } catch (error) {
    console.error('Fetch donations error:', error);
    return res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

router.get('/donations/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid donation ID' });
    }

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    return res.json(donation);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch donation' });
  }
});

router.post('/donations', requireAuth, requireDonor, async (req, res) => {
  try {
    const {
      foodName,
      foodType,
      quantity,
      unit,
      description,
      location,
      pickupTime,
      expiryTime,
      imageUrl,
      pickupInstructions
    } = req.body;

    if (
      typeof foodName !== 'string' || !foodName.trim() ||
      !foodType || !unit ||
      quantity === undefined || quantity === null || quantity === '' ||
      typeof location !== 'string' || !location.trim() ||
      !pickupTime || !expiryTime
    ) {
      return res.status(400).json({
        error: 'Please provide all required donation details'
      });
    }

    if (!Number.isFinite(Number(quantity)) || Number(quantity) < 1) {
      return res.status(400).json({
        error: 'Quantity must be at least 1'
      });
    }

    const pickupDate = new Date(pickupTime);
    const expiryDate = new Date(expiryTime);

    if (
      Number.isNaN(pickupDate.getTime()) ||
      Number.isNaN(expiryDate.getTime())
    ) {
      return res.status(400).json({
        error: 'Invalid pickup or expiry date'
      });
    }

    if (expiryDate <= new Date() || pickupDate >= expiryDate) {
      return res.status(400).json({
        error: 'Check the pickup and expiry times'
      });
    }

    if (
      imageUrl &&
      (
        typeof imageUrl !== 'string' ||
        !/^data:image\/(jpeg|jpg|png|webp);base64,/.test(imageUrl) ||
        imageUrl.length > 2800000
      )
    ) {
      return res.status(400).json({
        error: 'Invalid image or image is too large'
      });
    }

    const donation = await Donation.create({
      foodName: foodName.trim(),
      foodType,
      quantity: Number(quantity),
      unit,
      description: typeof description === 'string' ? description.trim() : '',
      location: location.trim(),
      pickupTime: pickupDate,
      expiryTime: expiryDate,
      imageUrl: imageUrl || '',
      pickupInstructions:
        typeof pickupInstructions === 'string'
          ? pickupInstructions.trim()
          : '',
      donorId: req.session.user.id,
      donorName: req.session.user.fullName,
      donorEmail: req.session.user.email,
      status: 'Available'
    });

    return res.status(201).json({
      message: 'Food donation created successfully',
      donation
    });

  } catch (error) {
    console.error('Donation creation error:', error);

    return res.status(400).json({
      error: 'Could not create donation'
    });
  }
});

router.put('/donations/:id', requireAuth, requireDonor, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid donation ID' });
    }

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    if (!donation.donorId || donation.donorId.toString() !== req.session.user.id) {
      return res.status(403).json({ error: 'You can only update your own donations' });
    }

    const allowedFields = [
  'foodName',
  'foodType',
  'quantity',
  'unit',
  'description',
  'location',
  'pickupTime',
  'expiryTime',
  'imageUrl',
  'pickupInstructions'
];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        donation[field] = req.body[field];
      }
    }
if (
  donation.imageUrl &&
  (
    typeof donation.imageUrl !== 'string' ||
    !/^data:image\/(jpeg|jpg|png|webp);base64,/.test(donation.imageUrl) ||
    donation.imageUrl.length > 2800000
  )
) {
  return res.status(400).json({
    error: 'Invalid image or image is too large'
  });
}

if (typeof donation.pickupInstructions === 'string') {
  donation.pickupInstructions = donation.pickupInstructions.trim();
}
    if (
      typeof donation.foodName !== 'string' || !donation.foodName.trim() ||
      typeof donation.location !== 'string' || !donation.location.trim() ||
      !donation.foodType || !donation.unit
    ) {
      return res.status(400).json({ error: 'Please provide valid donation details' });
    }

    if (!Number.isFinite(Number(donation.quantity)) || Number(donation.quantity) < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const pickupDate = new Date(donation.pickupTime);
    const expiryDate = new Date(donation.expiryTime);

    if (
      Number.isNaN(pickupDate.getTime()) ||
      Number.isNaN(expiryDate.getTime()) ||
      expiryDate <= new Date() ||
      pickupDate >= expiryDate
    ) {
      return res.status(400).json({ error: 'Check the pickup and expiry times' });
    }

    donation.foodName = donation.foodName.trim();
    donation.location = donation.location.trim();
    donation.quantity = Number(donation.quantity);
    donation.pickupTime = pickupDate;
    donation.expiryTime = expiryDate;

    await donation.save();

    return res.json({ message: 'Donation updated successfully', donation });
  } catch (error) {
    return res.status(400).json({ error: 'Could not update donation' });
  }
});

router.delete('/donations/:id', requireAuth, requireDonor, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid donation ID' });
    }

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    if (!donation.donorId || donation.donorId.toString() !== req.session.user.id) {
      return res.status(403).json({ error: 'You can only delete your own donations' });
    }

    await donation.deleteOne();

    return res.json({ message: 'Donation deleted successfully' });
  } catch (error) {
    return res.status(400).json({ error: 'Could not delete donation' });
  }
});

router.post('/collection-requests', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== 'ngo') {
      return res.status(403).json({ error: 'Only NGOs can request food collection' });
    }

    const { donationId } = req.body;

    if (!mongoose.isValidObjectId(donationId)) {
      return res.status(400).json({ error: 'Invalid donation ID' });
    }

    const donation = await Donation.findById(donationId);

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    if (donation.status !== 'Available' || new Date(donation.expiryTime) <= new Date()) {
      return res.status(400).json({ error: 'This donation is no longer available' });
    }

    const existingRequest = await CollectionRequest.findOne({
      donationId: donation._id,
      requesterId: req.session.user.id,
      status: { $in: ['Pending', 'Approved'] }
    });

    if (existingRequest) {
      return res.status(409).json({ error: 'You already have an active request for this donation' });
    }

    const collectionRequest = await CollectionRequest.create({
      donationId: donation._id,
      requesterId: req.session.user.id,
      requesterName: req.session.user.fullName,
      requesterEmail: req.session.user.email,
      status: 'Pending'
    });

    return res.status(201).json({
      message: 'Collection request submitted successfully',
      request: collectionRequest
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to submit collection request' });
  }
});

router.get('/collection-requests', requireAuth, async (req, res) => {
  try {
    const { id, role } = req.session.user;
    let filter;

    if (role === 'ngo') {
      filter = { requesterId: id };
    } else if (role === 'donor') {
      const donations = await Donation.find({ donorId: id }).select('_id');
      filter = { donationId: { $in: donations.map(donation => donation._id) } };
    } else if (role === 'volunteer') {
      filter = {
        $or: [
          {
            status: 'Approved',
            $and: [
              { $or: [{ volunteerId: null }, { volunteerId: { $exists: false } }] },
              { $or: [{ taskStatus: 'Available' }, { taskStatus: { $exists: false } }] }
            ]
          },
          { volunteerId: id }
        ]
      };
    } else {
      return res.status(403).json({ error: 'Invalid user role' });
    }

    const requests = await CollectionRequest.find(filter)
      .populate('donationId')
      .populate('requesterId', 'fullName email role')
      .populate('volunteerId', 'fullName email role')
      .sort({ createdAt: -1 });

    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch collection requests' });
  }
});

router.patch('/collection-requests/:id/status', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== 'donor') {
      return res.status(403).json({ error: 'Only donors can approve or reject requests' });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid collection request ID' });
    }

    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Approved or Rejected' });
    }

    const request = await CollectionRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Collection request not found' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending requests can be updated' });
    }

    const donation = await Donation.findById(request.donationId);

    if (!donation) {
      return res.status(404).json({ error: 'Associated donation not found' });
    }

    if (!donation.donorId || donation.donorId.toString() !== req.session.user.id) {
      return res.status(403).json({ error: 'You can only manage requests for your own donations' });
    }

    if (status === 'Approved') {
      if (donation.status !== 'Available' || new Date(donation.expiryTime) <= new Date()) {
        return res.status(409).json({ error: 'This donation is no longer available or has expired' });
      }

      const alreadyApproved = await CollectionRequest.findOne({
        donationId: donation._id,
        _id: { $ne: request._id },
        status: 'Approved'
      });

      if (alreadyApproved) {
        return res.status(409).json({ error: 'Another request has already been approved' });
      }

      donation.status = 'Requested';
      await donation.save();
    }

    request.status = status;
    await request.save();

return res.json({
  message: `Collection request ${status.toLowerCase()} successfully`,
  request
});
} catch (error) {
  return res.status(500).json({
    error: 'Failed to update collection request'
  });
}
});
// VOLUNTEER ACCEPTS AN APPROVED COLLECTION TASK

router.patch('/collection-requests/:id/accept', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== 'volunteer') {
      return res.status(403).json({
        error: 'Only volunteers can accept collection tasks'
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        error: 'Invalid collection request ID'
      });
    }

    const request = await CollectionRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'Approved',
        $or: [
          { volunteerId: null },
          { volunteerId: { $exists: false } }
        ]
      },
      {
        $set: {
          volunteerId: req.session.user.id,
          taskStatus: 'Accepted'
        }
      },
      { new: true }
    );

    if (!request) {
      return res.status(409).json({
        error: 'This task is no longer available'
      });
    }

    return res.json({
      message: 'Task accepted successfully',
      request
    });

  } catch (error) {
    console.error('Accept task error:', error);

    return res.status(500).json({
      error: 'Failed to accept task'
    });
  }
});


// VOLUNTEER UPDATES COLLECTION TASK STATUS

router.patch('/collection-requests/:id/task-status', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== 'volunteer') {
      return res.status(403).json({
        error: 'Only volunteers can update task status'
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        error: 'Invalid collection request ID'
      });
    }

    const { taskStatus } = req.body;

    if (!['Collected', 'Delivered'].includes(taskStatus)) {
      return res.status(400).json({
        error: 'Invalid task status'
      });
    }

    const request = await CollectionRequest.findOne({
      _id: req.params.id,
      volunteerId: req.session.user.id
    });

    if (!request) {
      return res.status(404).json({
        error: 'Assigned task not found'
      });
    }

    if (
      taskStatus === 'Collected' &&
      request.taskStatus !== 'Accepted'
    ) {
      return res.status(400).json({
        error: 'Task must be accepted before collection'
      });
    }

    if (
      taskStatus === 'Delivered' &&
      request.taskStatus !== 'Collected'
    ) {
      return res.status(400).json({
        error: 'Food must be collected before delivery'
      });
    }

    request.taskStatus = taskStatus;

    if (taskStatus === 'Delivered') {
      request.status = 'Completed';

      await Donation.findByIdAndUpdate(
        request.donationId,
        { $set: { status: 'Collected' } }
      );
    }

    await request.save();

    return res.json({
      message: `Task marked as ${taskStatus.toLowerCase()} successfully`,
      request
    });

  } catch (error) {
    console.error('Task status update error:', error);

    return res.status(500).json({
      error: 'Failed to update task status'
    });
  }
});
// DONOR DASHBOARD STATISTICS
router.get('/dashboard/donor', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== 'donor') {
      return res.status(403).json({
        error: 'Only donors can access this dashboard'
      });
    }

    const donorId = req.session.user.id;

    // Find all donations belonging to this donor
    const donations = await Donation.find({ donorId })
      .sort({ createdAt: -1 });

    const donationIds = donations.map(donation => donation._id);

    const now = new Date();

    // Count donation statistics
    const totalDonations = donations.length;

    const availableDonations = donations.filter(
      donation =>
        donation.status === 'Available' &&
        new Date(donation.expiryTime) > now
    ).length;

    // Count collection request statistics
    const pendingRequests = await CollectionRequest.countDocuments({
      donationId: { $in: donationIds },
      status: 'Pending'
    });

    const approvedRequests = await CollectionRequest.countDocuments({
      donationId: { $in: donationIds },
      status: 'Approved'
    });

    const completedDonations = await CollectionRequest.countDocuments({
      donationId: { $in: donationIds },
      status: 'Completed'
    });

    return res.json({
      totalDonations,
      availableDonations,
      pendingRequests,
      approvedRequests,
      completedDonations,
      recentDonations: donations.slice(0, 5)
    });

  } catch (error) {
    console.error('Donor dashboard error:', error);

    return res.status(500).json({
      error: 'Failed to load donor dashboard'
    });
  }
});
// NGO DASHBOARD STATISTICS
router.get('/dashboard/ngo', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== 'ngo') {
      return res.status(403).json({
        error: 'Only NGOs can access this dashboard'
      });
    }

    const ngoId = req.session.user.id;
    const now = new Date();

    // Count currently available food
    const availableFood = await Donation.countDocuments({
      status: 'Available',
      expiryTime: { $gt: now }
    });

    // Count this NGO's collection requests
    const myRequests = await CollectionRequest.find({
      requesterId: ngoId
    }).sort({ createdAt: -1 });

    const totalRequests = myRequests.length;

    const pendingRequests = myRequests.filter(
      request => request.status === 'Pending'
    ).length;

    const approvedRequests = myRequests.filter(
      request => request.status === 'Approved'
    ).length;

    const completedCollections = myRequests.filter(
      request => request.status === 'Completed'
    ).length;

    return res.json({
      availableFood,
      totalRequests,
      pendingRequests,
      approvedRequests,
      completedCollections,
      recentRequests: myRequests.slice(0, 5)
    });

  } catch (error) {
    console.error('NGO dashboard error:', error);

    return res.status(500).json({
      error: 'Failed to load NGO dashboard'
    });
  }
});
// VOLUNTEER DASHBOARD STATISTICS
router.get('/dashboard/volunteer', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== 'volunteer') {
      return res.status(403).json({
        error: 'Only volunteers can access this dashboard'
      });
    }

    const volunteerId = req.session.user.id;

    // Find available tasks
    const availableTasks = await CollectionRequest.countDocuments({
      status: 'Approved',
      $and: [
        {
          $or: [
            { volunteerId: null },
            { volunteerId: { $exists: false } }
          ]
        },
        {
          $or: [
            { taskStatus: 'Available' },
            { taskStatus: { $exists: false } }
          ]
        }
      ]
    });

    // Find tasks assigned to this volunteer
    const myTasks = await CollectionRequest.find({
      volunteerId
    })
      .populate('donationId')
      .populate('requesterId', 'fullName email')
      .sort({ createdAt: -1 });

    const acceptedTasks = myTasks.filter(
      task => task.taskStatus === 'Accepted'
    ).length;

    const awaitingDelivery = myTasks.filter(
      task => task.taskStatus === 'Collected'
    ).length;

    const completedDeliveries = myTasks.filter(
      task => task.taskStatus === 'Delivered'
    ).length;

    return res.json({
      availableTasks,
      acceptedTasks,
      awaitingDelivery,
      completedDeliveries,
      recentTasks: myTasks.slice(0, 5)
    });

  } catch (error) {
    console.error('Volunteer dashboard error:', error);

    return res.status(500).json({
      error: 'Failed to load volunteer dashboard'
    });
  }
});
module.exports = router;