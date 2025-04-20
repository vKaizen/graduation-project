const mongoose = require('mongoose');

async function fixWorkspaces() {
  try {
    // Connect to the database
    await mongoose.connect('mongodb://localhost:27017/graduation-db');
    console.log('Connected to MongoDB');

    // Get the collection directly (not using models)
    const db = mongoose.connection.db;
    const workspaces = await db.collection('workspaces').find({}).toArray();

    console.log(`Found ${workspaces.length} workspaces in the database`);
    let fixedCount = 0;

    // Process each workspace
    for (const workspace of workspaces) {
      console.log(`\nChecking workspace: ${workspace.name} (${workspace._id})`);
      
      // Skip if no owner
      if (!workspace.owner) {
        console.log('  No owner found, skipping');
        continue;
      }

      const ownerId = workspace.owner.toString();
      console.log(`  Owner ID: ${ownerId}`);
      
      // Check if members exists and is an array
      if (!Array.isArray(workspace.members)) {
        console.log('  Members is not an array, creating it');
        workspace.members = [];
      }

      // Check if owner is in members array
      let ownerInMembers = false;
      
      if (workspace.members.length > 0) {
        if (typeof workspace.members[0] === 'object' && workspace.members[0].userId) {
          // New structure
          ownerInMembers = workspace.members.some(m => 
            m.userId && m.userId.toString() === ownerId && m.role === 'owner'
          );
          console.log(`  Using new structure, owner in members: ${ownerInMembers}`);
        } else {
          // Old structure
          ownerInMembers = workspace.members.some(m => 
            m && (m.toString ? m.toString() === ownerId : m === ownerId)
          );
          console.log(`  Using old structure, owner in members: ${ownerInMembers}`);
          
          // Convert to new structure while we're at it
          console.log('  Converting to new structure');
          const newMembers = workspace.members.map(memberId => ({
            userId: memberId,
            role: memberId.toString() === ownerId ? 'owner' : 'member'
          }));
          workspace.members = newMembers;
          ownerInMembers = newMembers.some(m => m.userId.toString() === ownerId && m.role === 'owner');
        }
      } else {
        console.log('  Members array is empty');
      }

      // If owner is not in members, add them
      if (!ownerInMembers) {
        console.log('  Adding owner to members array');
        workspace.members.push({
          userId: workspace.owner,
          role: 'owner'
        });
        fixedCount++;
        
        // Save the updated workspace
        await db.collection('workspaces').updateOne(
          { _id: workspace._id },
          { $set: { members: workspace.members } }
        );
        console.log('  Workspace updated');
      } else {
        console.log('  Owner already in members array, no action needed');
      }
    }

    console.log(`\nFix completed. Fixed ${fixedCount} workspaces.`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed');
  }
}

// Run the function
fixWorkspaces(); 