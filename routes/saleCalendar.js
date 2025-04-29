import { Router } from 'express';
import { connectToDatabase } from '../db/dbConfig.js';
import { ObjectId } from 'mongodb';
import cron from 'node-cron';

const router = Router();

// Helper function to update expired events
async function updateExpiredEvents(collection) {
    const currentDate = new Date();
    try {
        // Update events where the current time is past the end date
        await collection.updateMany(
            {
                end_date_and_time: { $lt: currentDate },
                status: { $ne: 'completed' } // Ensure we don't repeatedly update completed events
            },
            {
                $set: { status: 'completed' }
            }
        );

        // Update events where the current time is between the start and end dates
        await collection.updateMany(
            {
                occurs_date_and_time: { $lte: currentDate },
                end_date_and_time: { $gte: currentDate },
                status: { $ne: 'ongoing' } // Ensure we don't repeatedly update ongoing events
            },
            {
                $set: { status: 'ongoing' }
            }
        );

        // Update events where the current time is before the start date
        await collection.updateMany(
            {
                occurs_date_and_time: { $gt: currentDate },
                status: { $ne: 'upcoming' } // Ensure we don't repeatedly update upcoming events
            },
            {
                $set: { status: 'upcoming' }
            }
        );
    } catch (error) {
        console.error('Error updating event statuses:', error);
    }
}

// Schedule status updates every minute
cron.schedule('* * * * *', async () => {
    try {
        const collection = await getSaleCalendarCollection();
        await updateExpiredEvents(collection);
    } catch (error) {
        console.error('Error in scheduled update:', error);
    }
});

async function getSaleCalendarCollection() {
    const db = await connectToDatabase();
    return db.collection('sale_calendar');
}

// Get all sale calendar entries with auto-status update
// Get all sale calendar entries with auto-status update and sorting
router.get('/', async (req, res) => {
    try {
        const collection = await getSaleCalendarCollection();
        await updateExpiredEvents(collection); // Ensure fresh statuses

        // Fetch all sale calendar entries
        const saleCalendar = await collection.find().toArray();

        // Convert UTC dates to local dates and sort by status and occurs_date_and_time
        const formattedSaleCalendar = saleCalendar.map(doc => {
            if (doc.occurs_date_and_time) {
                const date = new Date(doc.occurs_date_and_time);
                const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const time = date.toLocaleTimeString();
                doc.occurs_date_and_time = `${formattedDate} ${time}`;
            }
            if (doc.end_date_and_time) {
                const date = new Date(doc.end_date_and_time);
                const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const time = date.toLocaleTimeString();
                doc.end_date_and_time = `${formattedDate} ${time}`;
            }
            return doc;
        });

        // Sort by status and then by occurs_date_and_time
        const sortedSaleCalendar = formattedSaleCalendar.sort((a, b) => {
            // Sort by status: ongoing -> upcoming -> completed
            const statusOrder = { ongoing: 1, upcoming: 2, completed: 3 };
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }

            // If statuses are the same, sort by occurs_date_and_time
            const dateA = new Date(a.occurs_date_and_time);
            const dateB = new Date(b.occurs_date_and_time);
            return dateB - dateA;
        });

        res.send(sortedSaleCalendar);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching sale calendar', error });
    }
});


// Create new sale calendar with sequential s_no
router.post('/', async (req, res) => {
    try {
        const collection = await getSaleCalendarCollection();
        const { seller_name, state, district, location, occurs_date_and_time, end_date_and_time } = req.body;

        // Get latest s_no
        const latestEntry = await collection.find().sort({ s_no: -1 }).limit(1).toArray();
        const s_no = latestEntry.length > 0 ? latestEntry[0].s_no + 1 : 1;
        const tender_id = Math.floor(Math.random() * 9000000000) + 1000000000;

        // Ensure date and time are correctly formatted
        let occursDateTime = occurs_date_and_time;
        let endDateTime = end_date_and_time;

        // If only time is provided, append it to today's date
        if (!occursDateTime.includes('T')) {
            const today = new Date().toISOString().split('T')[0];
            occursDateTime = `${today}T${occursDateTime}`;
        }
        if (!endDateTime.includes('T')) {
            const today = new Date().toISOString().split('T')[0];
            endDateTime = `${today}T${endDateTime}`;
        }

        const newEntry = {

            seller_name,
            state,
            district,
            location,
            occurs_date_and_time: new Date(occursDateTime),
            end_date_and_time: new Date(endDateTime),
            status: 'upcoming',
            created_at: new Date()
        };

        const result = await collection.insertOne(newEntry);
        res.status(201).send({
            message: 'Sale calendar created successfully!',
            saleCalendar_Id: result.insertedId,
        });
    } catch (error) {
        console.error('Error creating sale calendar:', error);
        res.status(500).send({ message: 'Error creating sale calendar', error: error.message });
    }
});


// Delete sale calendar by ID
router.delete('/:id', async (req, res) => {
    try {
        const collection = await getSaleCalendarCollection();
        const result = await collection.deleteOne({
            _id: new ObjectId(req.params.id)
        });

        if (result.deletedCount === 0) {
            return res.status(404).send({ message: 'Sale calendar not found' });
        }

        res.send({
            message: 'Sale calendar deleted successfully!',
            id: req.params.id
        });
    } catch (error) {
        console.error('Error deleting sale calendar:', error);
        res.status(500).send({ message: 'Error deleting sale calendar', error: error.message });
    }
});

// Get sale calender summary for dashboard
router.get('/dashboard/saleCalendar-summary', async(req, res)=>{
    try{
        const saleCalendarCollection = await getSaleCalendarCollection();
        
        // Aggregate counts for ongoing, upcoming, completed sale calendars
        const total = await saleCalendarCollection.countDocuments();
        const ongoing = await saleCalendarCollection.countDocuments({ status: 'ongoing' });
        const upcoming = await saleCalendarCollection.countDocuments({ status: 'upcoming' });
        const completed = await saleCalendarCollection.countDocuments({ status: 'completed' });

        res.send({
            total: String(total).padStart(2, '0'),
            ongoing: String(ongoing).padStart(2, '0'),
            upcoming: String(upcoming).padStart(2, '0'),
            completed: String(completed).padStart(2, '0')
        });
    }catch(error){
        console.error('Error fetching sale calendar summary:', error);
        res.status(500).send({ message: 'Error fetching sale calendar summary', error: error.message });
    }
});

export default router;
