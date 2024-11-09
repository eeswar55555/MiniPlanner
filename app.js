const express = require("express");
const bodyparser = require("body-parser");
const date = require(__dirname + "/date.js"); 
const mongoose = require('mongoose'); 
const _ = require("lodash");

 
const app = express();

app.set('view engine', 'ejs');

app.use(bodyparser.urlencoded({extended:true}));
app.use(express.static("public"));

// ****************** DB ******************************************
 
mongoose.connect('mongodb://0.0.0.0:27017/todolistDB');

const itemsSchema = new mongoose.Schema({
    name : "String"
});

const Item = mongoose.model("Item",itemsSchema);

const item1 = new Item({
    name : "Welcome to to do list"
});
const item2 = new Item({
    name : "i♥u"
});
const item3 = new Item({
    name : "add checkbox love♥"
});

const defaultitems = [item1,item2,item3];

// Item.insertMany(defaultitems);

const lisSchema = new mongoose.Schema({
    name : "String",
    items : [itemsSchema]
});

const List = mongoose.model("List",lisSchema);


// *******************************************************************

app.get("/",function(req,res){

    Item.find({})
    .then(function(documents){
        if(documents.length === 0)
        {
           Item.insertMany(defaultitems);
        }
        
        List.deleteOne({name:"favicon.ico"})
        .then()
        .catch((err)=>{console.log(err);});

        List.find({})
        .then(function(all_lists){
            res.render("list", { ListTitle: "Today" , newlistitem: documents , every: all_lists} );
        }).catch((err)=>{console.log(err);});

    }).catch((err)=>{console.log(err);});

});

app.get("/:customListName",function(req,res){
    const customListName = req.params.customListName ;

    List.findOne({name:customListName})
   .then((foundList)=>{if(!foundList){

       const list = new List({
           name : customListName,
           items : defaultitems
       });
       list.save();
       res.redirect("/"+customListName);

    }   else {

        List.deleteOne({name:"favicon.ico"})
        .then()
        .catch((err)=>{console.log(err);});

        List.find({})
        .then(function(all_lists){
            res.render("list", { ListTitle: foundList.name , newlistitem: foundList.items , every: all_lists} );
        }).catch((err)=>{console.log(err);});

    }}).catch((err)=>{console.log(err);});

});

app.post("/list/add_new",function(req,res){
    res.redirect("/"+req.body.newlist);
})

app.post("/",function(req,res){
    
    let itemname = req.body.newitem;
    let listName = req.body.list;

    const item = new Item({
        name : itemname
    });

    if( listName === "Today" )
    {
        item.save();
        res.redirect("/");
    }
    else
    {
        List.findOne({name: listName})
        .then(function(foundlist){

             foundlist.items.push(item);
             foundlist.save();
             res.redirect("/"+listName);

        }).catch((err)=>{console.log(err);});
    }

}); 

app.get("/delete/:customList",function(req,res){
    const customListName = req.params.customList ;

    List.deleteOne({name:customListName})
    .then( function(){
        console.log("deleted : "+customListName);
        res.redirect("/");
    } ).catch((err)=>{console.log(err);});
});

app.post("/delete",function(req,res){
    const checkeditem = req.body.checkbox;
    const listName = req.body.listName;

    if( listName === "Today" )
    {
        Item.findByIdAndDelete(checkeditem)
            .then(function(deleteditem){ console.log('Delete Result:', deleteditem);})
            .catch((err)=>{console.log(err);});
    
        res.redirect("/");
    }
    else
    {
        // search $pull in gulgul
        // it removes element if there are any arrays embedded in our tuple/document...
        List.findOneAndUpdate({name : listName} , { $pull : {items:{_id:checkeditem}} })
            .then(function(foundList){

                res.redirect("/"+listName);

            }).catch((err)=>{console.log(err);});

    }
});





app.listen(3000,function(){
    console.log("server is running at 3000 port♥");
});

