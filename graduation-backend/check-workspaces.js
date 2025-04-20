const mongoose = require('mongoose');

async function checkWorkspaces() {
  try {
    // Connect to the database
    await mongoose.connect('mongodb://localhost:27017/graduation-db');
    console.log('Connected to MongoDB');

    // Get the collection directly (not using models)
    const db = mongoose.connection.db;
    const workspaces = await db.collection('workspaces').find({}).toArray();

    console.log(`Found ${workspaces.length} workspaces in the database`);

    // Check each workspace's member structure
    workspaces.forEach((workspace, index) => {
      console.log(`\nWorkspace ${index + 1}:`);
      console.log(`ID: ${workspace._id}`);
      console.log(`Name: ${workspace.name}`);
      console.log(`Owner: ${workspace.owner}`);
      
      if (workspace.members) {
        console.log(`Members count: ${workspace.members.length}`);
        
        if (workspace.members.length > 0) {
          console.log(`First member type: ${typeof workspace.members[0]}`);
          console.log(`First member value:`, workspace.members[0]);
          
          // Check all members structure
          const memberTypes = new Set();
          workspace.members.forEach(member => {
            memberTypes.add(typeof member);
          });
          
          console.log(`Member types in array: ${Array.from(memberTypes).join(', ')}`);
        }
      } else {
        console.log('No members field found');
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed');
  }
}

// Run the function
checkWorkspaces(); 