import { Router } from "express";
import { connectToDatabase } from "../db/dbConfig.js";
import { ObjectId } from "mongodb";
const router = Router();

// Function to get the community collection
async function getCommunityCollection() {
    const db = await connectToDatabase();
    return db.collection('community_list');
}

//Get all community list
router.get('/', async (req, res) => {
    try {
        const communityCollection = await getCommunityCollection();
        const community = await communityCollection.find().toArray();
        res.send(community);
    } catch (error) {
        res.status(500).send({ message: "Error fetching community list", error });
    }
});

// Function to safely access and update nested data
const updateNestedData = (existingData, newData) => {
    newData.forEach(newState => {
        // Find the existing state by name
        let existingState = existingData.find(es => es.name === newState.name);

        if (!existingState) {
            // If the state doesn't exist, create a new state with its districts and locations
            existingState = {
                id: new ObjectId(), // Generate a unique ID for the state
                name: newState.name,
                district_names: []
            };
            existingData.push(existingState);
        }

        // Iterate through the districts in the new state
        newState.district_names.forEach(newDistrict => {
            // Find the existing district by name
            let existingDistrict = existingState.district_names.find(ed => ed.name === newDistrict.name);

            if (!existingDistrict) {
                // If the district doesn't exist, create a new district with its locations
                existingDistrict = {
                    id: new ObjectId(), // Generate a unique ID for the district
                    name: newDistrict.name,
                    locations: []
                };
                existingState.district_names.push(existingDistrict);
            }

            // Iterate through the locations in the new district
            newDistrict.locations.forEach(newLocation => {
                // Find the existing location by name
                const existingLocation = existingDistrict.locations.find(el => el.location_name === newLocation.location_name);

                if (!existingLocation) {
                    // Add the new location if it doesn't exist
                    existingDistrict.locations.push({
                        id: new ObjectId(), // Generate a unique ID for the location
                        location_name: newLocation.location_name
                    });
                }
            });
        });
    });
};

// Add or Update Seller/Community
router.post('/sellers', async (req, res) => {
    try {
        const { seller_name, state_names } = req.body;

        if (!seller_name || !state_names) {
            return res.status(400).send({ message: 'Seller name and state details are required' });
        }

        // Get the database and collection
        const db = await connectToDatabase();
        const sellersCollection = db.collection('community_list');

        // Fetch all existing states from the database
        const existingSeller = await sellersCollection.findOne({ seller_name });

        let s_no;
        let updatedStateNames = [];

        if (existingSeller) {
            s_no = existingSeller.s_no; // Retain the existing serial number
            updatedStateNames = JSON.parse(JSON.stringify(existingSeller.state_names)); // Clone existing state_names
        } else {
            const lastSeller = await sellersCollection.find().sort({ s_no: -1 }).limit(1).toArray();
            s_no = lastSeller.length > 0 ? lastSeller[0].s_no + 1 : 1; // Generate new serial number
        }

        // Merge new state_names with existing state_names
        updateNestedData(updatedStateNames, state_names);

        // Calculate counts dynamically
        const overallStateCount = updatedStateNames.length;
        let overallDistrictCount = 0;
        let overallLocationCount = 0;

        updatedStateNames.forEach(state => {
            overallDistrictCount += state.district_names.length;
            state.district_names.forEach(district => {
                overallLocationCount += district.locations.length;
            });
        });

        if (existingSeller) {
            // Update existing seller
            await sellersCollection.updateOne(
                { seller_name },
                {
                    $set: {
                        state_names: updatedStateNames,
                        states: overallStateCount,
                        district: overallDistrictCount,
                        overall_location: overallLocationCount
                    }
                }
            );

            return res.status(200).send({ message: 'Seller updated successfully', s_no });
        } else {
            // Insert new seller
            const newSellerData = {
                id: Math.floor(10000 + Math.random() * 90000), // Random unique ID for the seller
                s_no,
                seller_name,
                states: overallStateCount,
                district: overallDistrictCount,
                overall_location: overallLocationCount,
                state_names: updatedStateNames
            };

            await sellersCollection.insertOne(newSellerData);
            return res.status(201).send({ message: 'Seller added successfully', s_no });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Error processing request', error });
    }
});

//Delete community by ID
router.delete('/:id',async(req, res) => {
    try{
        const sellersCollection = await getCommunityCollection();
        const sellerId = req.params.id;
        const result = await sellersCollection.deleteOne({_id: new ObjectId(sellerId)});
        if(result.deletedCount === 0){
            return res.status(404).send({ message: 'Seller not found' });
        }
        res.send({ message: 'Seller deleted successfully' });
    } catch (error) {
      console.error('Error deleting seller:', error);
      res.status(500).send({ message: 'Error deleting seller', error: error.message });
    }
})

export default router;