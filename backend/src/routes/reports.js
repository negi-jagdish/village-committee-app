const express = require('express');
const db = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /pending-dues
// Generates a matrix of Member vs Drive pending amounts
router.get('/pending-dues', auth, async (req, res) => {
    try {
        // 1. Fetch Metadata (Drives)
        const [drives] = await db.query(
            'SELECT id, title, title_hi, amount_per_member FROM contribution_drives WHERE is_active = TRUE ORDER BY created_at DESC'
        );

        // Add Legacy Drive pseudo-object
        const reportColumns = [
            { id: 'legacy', title: 'Legacy Due', title_hi: 'पिछला बकाया', amount_per_member: 0 },
            ...drives.map(d => ({ ...d, amount_per_member: parseFloat(d.amount_per_member) }))
        ];

        // 2. Fetch Members (Active Only)
        const [members] = await db.query(
            `SELECT id, name, father_name, village_landmark, legacy_due 
             FROM members 
             WHERE status = 'active'
             ORDER BY village_landmark, name`
        );

        // 3. Fetch All Income Transactions (Approved)
        const [transactions] = await db.query(
            `SELECT member_id, drive_id, amount 
             FROM transactions 
             WHERE type = 'income' AND status = 'approved'`
        );

        // 4. Fetch Waivers
        const [waivers] = await db.query('SELECT member_id, drive_id FROM waivers');

        // Helper: Quick Lookup Maps
        // Transaction Map: memberId -> driveId (or 'legacy') -> totalPaid
        const paymentMap = {};
        transactions.forEach(t => {
            const mId = t.member_id;
            const dId = t.drive_id === null ? 'legacy' : t.drive_id;

            if (!paymentMap[mId]) paymentMap[mId] = {};
            if (!paymentMap[mId][dId]) paymentMap[mId][dId] = 0;

            paymentMap[mId][dId] += parseFloat(t.amount);
        });

        // Waiver Map: memberId -> driveId -> true
        const waiverMap = {};
        waivers.forEach(w => {
            if (!waiverMap[w.member_id]) waiverMap[w.member_id] = {};
            waiverMap[w.member_id][w.drive_id] = true;
        });

        // 5. Process Data
        const groupedData = {}; // Key: Landmark -> { landmark, members: [] }
        const grandTotals = { total: 0 }; // Key: driveId -> total, plus 'total' for everything

        // Initialize grand totals for columns
        reportColumns.forEach(col => {
            grandTotals[col.id] = 0;
        });

        members.forEach(member => {
            const rowData = {
                id: member.id,
                name: member.name,
                father_name: member.father_name,
                pending: {},
                row_total: 0
            };

            // Landmark Grouping
            const landmark = member.village_landmark || 'Unassigned';
            if (!groupedData[landmark]) {
                groupedData[landmark] = { landmark, members: [], subtotal: 0 };
            }

            // Calculate Legacy Dues
            const legacyDue = parseFloat(member.legacy_due || 0);
            if (legacyDue > 0) {
                const paid = paymentMap[member.id]?.['legacy'] || 0;
                const pending = Math.max(0, legacyDue - paid);
                rowData.pending['legacy'] = pending;
            } else {
                rowData.pending['legacy'] = 0;
            }

            // Calculate Drive Dues
            drives.forEach(drive => {
                const isWaived = waiverMap[member.id]?.[drive.id];
                if (isWaived) {
                    rowData.pending[drive.id] = 0;
                } else {
                    const paid = paymentMap[member.id]?.[drive.id] || 0;
                    const required = parseFloat(drive.amount_per_member);
                    const pending = Math.max(0, required - paid);
                    rowData.pending[drive.id] = pending;
                }
            });

            // Sum up Row Totals
            Object.keys(rowData.pending).forEach(key => {
                const val = rowData.pending[key];
                rowData.row_total += val;

                // Add to Grand Totals (Column-wise)
                grandTotals[key] = (grandTotals[key] || 0) + val;
            });

            grandTotals.total += rowData.row_total;
            groupedData[landmark].subtotal += rowData.row_total;

            /* Optimization: Only include columns that have at least SOME pending amount across all users? 
               User asked for ALL columns but for mobile view maybe we can filter later. 
               For now sending full matrix. */

            groupedData[landmark].members.push(rowData);
        });

        // Convert grouped object to array
        const groups = Object.values(groupedData).sort((a, b) => a.landmark.localeCompare(b.landmark));

        res.json({
            columns: reportColumns,
            groups: groups,
            grand_totals: grandTotals
        });

    } catch (error) {
        console.error('Pending Dues Report Error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// GET /payments-received
// Generates a matrix of Member vs Drive PAID amounts
router.get('/payments-received', auth, async (req, res) => {
    try {
        // 1. Fetch Metadata (Drives)
        const [drives] = await db.query(
            'SELECT id, title, title_hi, amount_per_member FROM contribution_drives WHERE is_active = TRUE ORDER BY created_at DESC'
        );

        // Add Legacy Drive pseudo-object
        const reportColumns = [
            { id: 'legacy', title: 'Legacy Due', title_hi: 'पिछला बकाया', amount_per_member: 0 },
            ...drives.map(d => ({ ...d, amount_per_member: parseFloat(d.amount_per_member) }))
        ];

        // 2. Fetch Members (Active Only)
        const [members] = await db.query(
            `SELECT id, name, father_name, village_landmark 
             FROM members 
             WHERE status = 'active'
             ORDER BY village_landmark, name`
        );

        // 3. Fetch All Income Transactions (Approved)
        const [transactions] = await db.query(
            `SELECT member_id, drive_id, amount 
             FROM transactions 
             WHERE type = 'income' AND status = 'approved'`
        );

        // 4. Fetch Waivers
        const [waivers] = await db.query('SELECT member_id, drive_id FROM waivers');

        // Helper: Quick Lookup Maps
        const paymentMap = {};
        transactions.forEach(t => {
            const mId = t.member_id;
            const dId = t.drive_id === null ? 'legacy' : t.drive_id;

            if (!paymentMap[mId]) paymentMap[mId] = {};
            if (!paymentMap[mId][dId]) paymentMap[mId][dId] = 0;

            paymentMap[mId][dId] += parseFloat(t.amount);
        });

        const waiverMap = {};
        waivers.forEach(w => {
            if (!waiverMap[w.member_id]) waiverMap[w.member_id] = {};
            waiverMap[w.member_id][w.drive_id] = true;
        });

        // 5. Process Data
        const groupedData = {}; // Key: Landmark -> { landmark, members: [] }
        const grandTotals = { total: 0 }; // Key: driveId -> total, plus 'total' for everything

        // Initialize grand totals for columns
        reportColumns.forEach(col => {
            grandTotals[col.id] = 0;
        });

        members.forEach(member => {
            const rowData = {
                id: member.id,
                name: member.name,
                father_name: member.father_name,
                paid: {},
                is_waived: {}, // To track waiver status per drive
                row_total: 0
            };

            // Landmark Grouping
            const landmark = member.village_landmark || 'Unassigned';
            if (!groupedData[landmark]) {
                groupedData[landmark] = { landmark, members: [], subtotal: 0 };
            }

            // Calculate Paid Amounts for Legacy
            const legacyPaid = paymentMap[member.id]?.['legacy'] || 0;
            rowData.paid['legacy'] = legacyPaid;

            // Calculate Paid Amounts for Drives
            drives.forEach(drive => {
                const isWaived = waiverMap[member.id]?.[drive.id];
                rowData.is_waived[drive.id] = !!isWaived;

                const paid = paymentMap[member.id]?.[drive.id] || 0;
                rowData.paid[drive.id] = paid;
            });

            // Sum up Row Totals (only actual payments)
            Object.keys(rowData.paid).forEach(key => {
                const val = rowData.paid[key];
                rowData.row_total += val;

                // Add to Grand Totals (Column-wise)
                grandTotals[key] = (grandTotals[key] || 0) + val;
            });

            grandTotals.total += rowData.row_total;
            groupedData[landmark].subtotal += rowData.row_total;

            groupedData[landmark].members.push(rowData);
        });

        // Convert grouped object to array
        const groups = Object.values(groupedData).sort((a, b) => a.landmark.localeCompare(b.landmark));

        res.json({
            columns: reportColumns,
            groups: groups,
            grand_totals: grandTotals
        });

    } catch (error) {
        console.error('Payments Received Report Error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

module.exports = router;
