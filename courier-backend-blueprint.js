/**
 * Courier Backend Blueprint (Node.js/Express)
 * This file provides a reference implementation for the missing courier endpoints.
 */

const express = require('express');
const router = express.Router();

// Mock database update functions
const updateCourierStatus = async (userId, isOnline) => {
    console.log(`[DB] Updating courier ${userId} status to ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
    // UPDATE users SET isOnline = ? WHERE id = ?
};

const updateCourierLocation = async (userId, latitude, longitude) => {
    console.log(`[DB] Updating courier ${userId} location to ${latitude}, ${longitude}`);
    // UPDATE users SET latitude = ?, longitude = ?, lastLocationUpdate = NOW() WHERE id = ?
};

/**
 * PUT /courier/status
 * Updates the online/offline status of the current courier.
 */
router.put('/status', async (req, res) => {
    try {
        const { isOnline } = req.body;
        const userId = req.user.id; // Assuming auth middleware sets req.user

        if (typeof isOnline !== 'boolean') {
            return res.status(400).json({ message: 'isOnline must be a boolean' });
        }

        await updateCourierStatus(userId, isOnline);
        res.json({ success: true, isOnline });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * PUT /courier/location
 * Updates the GPS coordinates of the current courier.
 */
router.put('/location', async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const userId = req.user.id;

        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return res.status(400).json({ message: 'Invalid coordinates' });
        }

        await updateCourierLocation(userId, latitude, longitude);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
