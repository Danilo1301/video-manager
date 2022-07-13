var model = $("#boomark-model");

var boomarks = [];
var videoPlayingTime = 0;

function updateVideoTime() {
    document.getElementById("addtime").textContent = msToTime(videoPlayingTime);
}

document.getElementById('video').addEventListener('timeupdate', function() {
    videoPlayingTime = this.currentTime*1000
    updateVideoTime();
}, false);

function newBoomark(boomark) {
    var elm = $(model).clone()

    var name = boomark.name;
    var from = boomark.from || 0;
    var to = boomark.to || 0;

    elm[0].id = "";
    elm.addClass("boomark")

    elm.find(".name").val(name)
    elm.find(".time_from").text(msToTime(from))
    elm.find(".time_to").text(msToTime(to))
   
    console.log(elm)

    elm.find(".time_from").click(() => {
        document.getElementById("video").currentTime = from/1000;
    })

    elm.find(".time_to").click(() => {
        document.getElementById("video").currentTime = to/1000;
    })

    elm.find(".remove").click(() => {
        removeBoomark(boomarks.indexOf(boomark))
    })

    $("#boomarks").append(elm);
    elm.show();
}

$(".newBoomark").click(() => {
    var newBoomarkEl = document.getElementsByClassName("newBoomark")[0];
    var newBoomarkName = document.getElementsByClassName("newBoomarkName")[0];

    var value = newBoomarkName.value;
    newBoomarkName.value = "";
    
    newBoomarkEl.disabled = true;

    submitNewBoomark(value, videoPlayingTime, undefined, () => {
        newBoomarkEl.disabled = false;
    });
})

$(".changeVideoName").click(() => {
    var el = document.getElementsByClassName("videoName")[0];
    var value = el.value;
    
    changeName(value);
})

$(".markComplete").click(() => {
    fetch(`/video/${videoId}/changestatus`).then(() => {
        //location.href = "/";
        location.reload();
    })
})

$(".deleteVideo").click(() => {
    const value = prompt(`Delete video with ${boomarks.length} boomarks?`);
    
    if(value != null) {
        fetch(`/video/${videoId}/delete`).then(function(response) {
            alert("Deleted!") 
        })
    }
})

function changeName(name)
{
    console.log(`Change name to '${name}'`);

    fetch(`/video/${videoId}/changename?` + new URLSearchParams({name: name})).then(function(response) {
        console.log("Changed");

        location.reload();
    })
}

for (const e of $(".addby")) {
    const addby = e.attributes.by.value;

    $(e).click(() => {

        document.getElementById("video").currentTime += parseInt(addby);
        //window.scrollTo(0, 40)
    })
}

function updateBoomarks() {
    for(var boomark of boomarks) {

        newBoomark(boomark);
    }
}

function getBoomarks() {
    $(".boomark").remove();

    fetch(`/video/${videoId}/boomarks`).then(function(response) {
        return response.json();
    })
    .then(function(b) {
        this.boomarks = b;
        updateBoomarks();
    });

    updateVideoTime();
}


function removeBoomark(index) {
    fetch(`/video/${videoId}/boomarks/remove?` + new URLSearchParams({index: index})).then(() => {
        getBoomarks();
    });
}

function submitNewBoomark(name, start, end, callback) {
    var params = {
        name: name,
        start: start
    }

    if(end) { params.end = end }

    console.log(params)

    fetch(`/video/${videoId}/boomarks/add?` + new URLSearchParams(params)).then(() => {
        getBoomarks();
        callback();
    })
}

getBoomarks();

function msToTime(s) {

    // Pad to 2 or 3 digits, default is 2
    function pad(n, z) {
      z = z || 2;
      return ('00' + n).slice(-z);
    }
  
    var ms = s % 1000;
    s = (s - ms) / 1000;
    var secs = s % 60;
    s = (s - secs) / 60;
    var mins = s % 60;
    var hrs = (s - mins) / 60;
  
    return pad(hrs) + ':' + pad(mins) + ':' + pad(secs);
  }
  
function jumpToVideo(by) {
    console.log(videoId, by);

    location.href = "/jump/?videoId=" + videoId + "&by=" + by;
}

