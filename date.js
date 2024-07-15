
module.exports.GetDate = GetDate;

function GetDate() 
{  
    var today = new Date();
    
    // var week = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    // day = week[ today.getDay() ];
    
    // if(today.getDay()===6 || today.getDay===0)
    // {
    //     day="Weekend";
    // }
    // else
    // {
    //     day="WeekDay";
    // }
    
    let options = {
        weekday:"long",
        day : "numeric",
        month:"long"
    };
    
    let day = today.toLocaleDateString("en-IN",options);
    
    return day;
}

// short code

exports.GetDay = function () {

    var today = new Date();

    let options = {
        weekday:"long",
    };

    let day = today.toLocaleDateString("en-IN",options);

    return day;
}