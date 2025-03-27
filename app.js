const express = require("express");
const bodyparser = require("body-parser");
const date = require(__dirname + "/date.js"); 
const mongoose = require('mongoose'); 
const _ = require("lodash");
const session = require("express-session");
const bcrypt = require('bcryptjs');

 
const app = express();

app.set('view engine', 'ejs');
app.use(bodyparser.urlencoded({extended:true}));
app.use(express.static("public"));

//*********************************** session ************************************ */

app.use(session({
    secret: 'a little secret ♥',
    resave: false,
    saveUninitialized: false,
}));

// ****************** DB ******************************************
 
mongoose.connect('mongodb://0.0.0.0:27017/todolistDB_2');

const itemsSchema = new mongoose.Schema({
    name : String,
    flag: {
        type: Number, // Changed to integer
        default: 0    // Optional: sets a default value (e.g., 0)
    },
    resource: {
        type: [String], // Array of strings
        default: []     // Optional: initializes with an empty array if not provided
    }
});

const Item = mongoose.model("Item",itemsSchema);

const item1 = new Item({
    name : "Welcome to to do list"
});
const item2 = new Item({
    name : "You can tasks items here"
});
const item3 = new Item({
    name : "You can also add task pages"
});

const defaultitems = [item1,item2,item3];

// Item.insertMany(defaultitems);

const lisSchema = new mongoose.Schema({
    name : "String",
    items : [itemsSchema]
});

const List = mongoose.model("List",lisSchema);

//************************************************************** */

const personSchema = new mongoose.Schema({
    username : "String",
    password : "String",
    lists : [lisSchema],
    items : [itemsSchema]
});

const Person_collection = mongoose.model("Person",personSchema);



const resouceSchema = new mongoose.Schema({
    name : String
});

const Resource_Collection = mongoose.model("Resource",resouceSchema);



// *******************************************************************


// POST route
app.post("/", function (req, res) {
    const itemData = req.body.newitem; // itemname + resources
    const listName = req.body.list;

    // Split the itemData string to separate item name and resources
    const itemParts = itemData.split("+");
    const itemName = itemParts[0]; // The first part is the item name
    const resources = itemParts.slice(1); // The rest are resources

    // Check if any of the resources already exist in the Resource_Collection
    Resource_Collection.find({ name: { $in: resources } })
        .then(existingResources => {
            // Create an array of existing resource names
            const existingResourceNames = existingResources.map(resource => resource.name);

            // If any resource is already in the database, alert the user
            const duplicateResources = resources.filter(resource => existingResourceNames.includes(resource));

            if (duplicateResources.length > 0) {
                // Alert the user that some resources are already used
                return res.status(400).send({
                    message: `The following resources are already being used: ${duplicateResources.join(", ")}`
                });
            }

            // Create an array of resource objects to insert into the database
            const resourceDocuments = resources.map(resourceName => ({ name: resourceName }));

            // Insert all resources at once using insertMany
            return Resource_Collection.insertMany(resourceDocuments)
                .then(insertedResources => {
                    // Extract the resource IDs from the inserted resources
                    const resourceIds = insertedResources.map(resource => resource._id);

                    // Create the new item with the list of resource IDs
                    const item = new Item({
                        name: itemName,
                        resource: resourceIds // Store the IDs of the resources in the resource array
                    });

                    // Find the user and update their list as before
                    if (req.session.user) {
                        Person_collection.findById(req.session.user._id)
                            .then(function (foundUser) {
                                const isSharedList = listName.includes("_shared_list");
                                if (isSharedList) {
                                    const [user1, user2] = listName.split("_shared_list")[0].split("_");

                                    if (!user1 || !user2) {
                                        console.error("Invalid list name format");
                                        return res.redirect("/"); // Redirect if listName is invalid
                                    }

                                    Person_collection.find({ username: { $in: [user1, user2] } })
                                        .then(users => {
                                            if (users.length < 2) {
                                                console.error("One or both users not found");
                                                return res.redirect("/"); // Redirect if one or both users are missing
                                            }

                                            const updatePromises = users.map(user => {
                                                if (!Array.isArray(user.lists)) {
                                                    console.error(`sharedLists not found or invalid for user: ${user.username}`);
                                                    return Promise.resolve(); // Skip this user without throwing an error
                                                }

                                                const sharedList = user.lists.find(list => list.name === listName);
                                                if (sharedList) {
                                                    sharedList.items.push(item); // Add the new item to the shared list
                                                } else {
                                                    console.error(`Shared list not found for user: ${user.username}`);
                                                }
                                                return user.save(); // Save changes for each user
                                            });

                                            return Promise.all(updatePromises);
                                        })
                                        .then(() => res.redirect("/" + listName))
                                        .catch(err => console.error("Error updating shared list:", err));

                                } else {
                                    // Handle normal list addition
                                    if (listName === "Today") {
                                        foundUser.items.push(item);
                                        foundUser.save()
                                            .then(() => res.redirect("/"))
                                            .catch(err => console.log(err));
                                    } else {
                                        const foundList = foundUser.lists.find(list => list.name === listName);
                                        if (foundList) {
                                            foundList.items.push(item);
                                            foundUser.save()
                                                .then(() => res.redirect("/" + listName))
                                                .catch(err => console.log(err));
                                        }
                                    }
                                }
                            })
                            .catch(err => console.log(err));
                    } else {
                        res.redirect("/t/t_login");
                    }
                })
        })
        .catch(err => {
            console.error("Error checking for existing resources:", err);
            res.redirect("/"); // Redirect if there's an error checking resources
        });
});



app.get("/",function(req,res){

    if (req.session.user) {
        Person_collection.findById(req.session.user._id)
            .then(function (foundUser) {
                if (foundUser) {
                    res.render("list", { 
                        ListTitle: "Today", 
                        newlistitem: foundUser.items, 
                        every: foundUser.lists 
                    });
                } else {
                    res.redirect("/t/t_login");
                }
            })
            .catch(err => console.log(err));
    } else {
        res.redirect("/t/t_login");
    }

    // Item.find({})
    // .then(function(documents){
    //     if(documents.length === 0)
    //     {
    //        Item.insertMany(defaultitems);
    //     }
        
    //     List.deleteOne({name:"favicon.ico"})
    //     .then()
    //     .catch((err)=>{console.log(err);});

    //     List.find({})
    //     .then(function(all_lists){
    //         res.render("list", { ListTitle: "Today" , newlistitem: documents , every: all_lists} );
    //     }).catch((err)=>{console.log(err);});

    // }).catch((err)=>{console.log(err);});


});

app.get("/:customListName", function (req, res) {
    const customListName = req.params.customListName;

    if (req.session.user) {
        Person_collection.findById(req.session.user._id)
            .then(function (foundUser) {
                const foundList = foundUser.lists.find(list => list.name === customListName);
                if (!foundList) {
                    const newList = new List({
                        name: customListName,
                        items: []
                    });
                    foundUser.lists.push(newList);
                    foundUser.save()
                        .then(() => res.redirect("/" + customListName))
                        .catch(err => console.log(err));
                } else {
                    res.render("list", { 
                        ListTitle: foundList.name, 
                        newlistitem: foundList.items, 
                        every: foundUser.lists 
                    });
                }
            })
            .catch(err => console.log(err));
    } else {
        res.redirect("/t/t_login");
    }
});

app.post("/list/add_new",function(req,res){
    res.redirect("/"+req.body.newlist);
});

// app.post("/", function (req, res) {
//     const itemname = req.body.newitem;
//     const listName = req.body.list;

//     const item = new Item({ name: itemname });

//     if (req.session.user) {
//         Person_collection.findById(req.session.user._id)
//             .then(function (foundUser) {
//                 if (listName === "Today") {
//                     foundUser.items.push(item);
//                     foundUser.save()
//                         .then(() => res.redirect("/"))
//                         .catch(err => console.log(err));
//                 } else {
//                     const foundList = foundUser.lists.find(list => list.name === listName);
//                     if (foundList) {
//                         foundList.items.push(item);
//                         foundUser.save()
//                             .then(() => res.redirect("/" + listName))
//                             .catch(err => console.log(err));
//                     }
//                 }
//             })
//             .catch(err => console.log(err));
//     } else {
//         res.redirect("/t/t_login");
//     }
// });

app.get("/delete/:customList", function (req, res) {
    const customListName = req.params.customList;

    if (req.session.user) {
        Person_collection.findById(req.session.user._id)
            .then(function (foundUser) {
                if (foundUser) {
                    // Find the index of the list to delete
                    const listIndex = foundUser.lists.findIndex(list => list.name === customListName);

                    if (listIndex > -1) {
                        // Remove the list from the array
                        foundUser.lists.splice(listIndex, 1);

                        // Save the user document after modification
                        foundUser.save()
                            .then(() => {
                                console.log("Deleted list: " + customListName);
                                res.redirect("/");
                            })
                            .catch(err => console.log(err));
                    } else {
                        console.log("List not found.");
                        res.redirect("/");
                    }
                } else {
                    console.log("User not found.");
                    res.redirect("/t/t_login");
                }
            })
            .catch(err => console.log(err));
    } else {
        res.redirect("/t/t_login");
    }
});

app.post("/delete", function (req, res) {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;
    const newFlagValue = req.body.flag; // Assuming the flag value is sent from the client

    if (req.session.user) {
        Person_collection.findById(req.session.user._id)
            .then(function (foundUser) {
                if (!foundUser) {
                    console.log("User not found");
                    return res.redirect("/t/t_login");
                }

                if (listName === "Today") {
                    // Find the item to update the flag if provided
                    const itemToUpdate = foundUser.items.find(item => item._id.toString() === checkedItemId);
                    if (itemToUpdate) {
                        // Update the flag if a new value is provided
                        if (newFlagValue !== undefined) {
                            itemToUpdate.flag = parseInt(newFlagValue, 10); // Ensure it's a number
                        }

                        // Delete all resources related to this item from the Resource_Collection
                        Resource_Collection.deleteMany({
                            _id: { $in: itemToUpdate.resource } // Delete resources whose IDs match the ones in the item's resource array
                        })
                        .then(() => {
                            // Remove the item from the user's list
                            foundUser.items = foundUser.items.filter(item => item._id.toString() !== checkedItemId);
                            return foundUser.save();
                        })
                        .then(() => res.redirect("/"))
                        .catch(err => console.log(err));
                    }
                } else {
                    // Handle deletion for a specific list within the user's lists collection
                    const list = foundUser.lists.find(l => l.name === listName);
                    if (list) {
                        // Find the item in the specific list
                        const itemToUpdate = list.items.find(item => item._id.toString() === checkedItemId);
                        if (itemToUpdate) {
                            // Update the flag if a new value is provided
                            if (newFlagValue !== undefined) {
                                itemToUpdate.flag = parseInt(newFlagValue, 10); // Ensure it's a number
                            }

                            // Delete all resources related to this item from the Resource_Collection
                            Resource_Collection.deleteMany({
                                _id: { $in: itemToUpdate.resource } // Delete resources whose IDs match the ones in the item's resource array
                            })
                            .then(() => {
                                // Remove the item from the list
                                list.items = list.items.filter(item => item._id.toString() !== checkedItemId);
                                return foundUser.save();
                            })
                            .then(() => res.redirect("/" + listName))
                            .catch(err => console.log(err));
                        }
                    } else {
                        console.log("List not found");
                        res.redirect("/");
                    }
                }
            })
            .catch(err => console.log(err));
    } else {
        res.redirect("/t_login");
    }
});



//**************************************************************** */

app.get("/tms/abc",function(req,res){
    res.render("t_open",{});
});


app.get("/t/t_login",function(req,res){
    res.render("t_login",{});
});

app.get("/t/t_signup",function(req,res){
    res.render("t_signup",{});
});


app.post("/t_signup",async function(req,res){

    bcrypt.genSalt(10, (err, salt) => {
        if (err) {
            console.log("errorrrr");
        }
        bcrypt.hash(req.body.password, salt, (err, hash) => {
            if (err) {
                // Handle error
                return;
            }
            hashedPassword=hash;

            const initialItem = new Item({ name: "Welcome to your personalized list!" });
            const initialList = new List({ name: "My List", items: [initialItem] });

            const neww = new Person_collection({
                username : req.body.username,
                password : hash,
                items: [initialItem],
                lists: [initialList]
            });
            neww.save();
            req.session.user=neww;
            res.redirect('/');
        });
    });
});

app.post("/t_login",async function(req,res){

    Person_collection.findOne({username:req.body.username})
    .then(function(found_user){
        if(!found_user)
        {
            console.log("not found");
            res.redirect("/t_login");
        }
        else
        {
            bcrypt.compare(req.body.password,found_user.password,function(err,result){
                if(result === true)
                {
                    req.session.user=found_user;
                    res.redirect('/');
                }
                else
                {
                    console.log("Bad credentials");
                }
            })
        }
    }).catch(function(err){console.log(err);});
});




app.post("/t/create-shared-list", function (req, res) {
    const sharedUsername = req.body.sharedUser;

    if (!req.session.user) {
        return res.redirect("/t/t_login"); // Ensure the user is logged in
    }

    Person_collection.findOne({ username: sharedUsername })
        .then(function (foundSharedUser) {
            if (!foundSharedUser) {
                console.log("Shared user not found");
                return res.redirect("/");
            }

            // Both the current user and the found user must have access to the shared list
            Person_collection.findById(req.session.user._id)
                .then(function (currentUser) {
                    if (!currentUser) {
                        console.log("Current user not found");
                        return res.redirect("/t/t_login");
                    }

                    // Create a new shared list
                    const sharedListName = `${currentUser.username}_${foundSharedUser.username}_shared_list`;
                    let sharedList = new List({
                        name: sharedListName,
                        items: []
                    });

                    // Save shared list to both users' lists
                    currentUser.lists.push(sharedList);
                    foundSharedUser.lists.push(sharedList);

                    Promise.all([currentUser.save(), foundSharedUser.save()])
                        .then(function () {
                            res.redirect("/" + sharedListName);
                        })
                        .catch(function (err) {
                            console.log("Error saving shared list:", err);
                            res.redirect("/");
                        });
                })
                .catch(function (err) {
                    console.log("Error finding current user:", err);
                    res.redirect("/");
                });
        })
        .catch(function (err) {
            console.log("Error finding shared user:", err);
            res.redirect("/");
        });
});




app.listen(3000,function(){
    console.log("server is running at 3000 port♥");
});

