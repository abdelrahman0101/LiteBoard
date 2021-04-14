var cnvs = document.querySelector("#board");
var ctx = cnvs.getContext("2d");
var lineWidth = 4;
//ctx.translate(0.5, 0.5);

var drawing = false;
var x = 0;
var y = 0;

var page_list = [];
var selected_tool = "pen";

var tool_options = {
    "select": {

    },
    "pen": {
        lineWidth: 4,
        strokeStyle: '#000000',
        lineCap: "round",
        lineJoin: 'round'
    },
    "highlighter" : {
        lineWidth: 10,
        strokeStyle: "#FFFF00",
        lineCap: "round",
        lineJoin: 'round'
    },
    "eraser": {
        lineWidth: 30,
        strokeStyle: 'white'
    },

};

last_point = {x:0, y:0};

cnvs.addEventListener("pointerdown", function (event) {
    drawing = true;
    var x = event.clientX - cnvs.getBoundingClientRect().left;
    var y = event.clientY - cnvs.getBoundingClientRect().top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    last_point.x = x;
    last_point.y = y;
});



cnvs.addEventListener('pointermove', function (event) {
    var x = event.clientX - cnvs.getBoundingClientRect().left;
    var y = event.clientY - cnvs.getBoundingClientRect().top;
    showStatus("X: " + Math.round(x) + ", Y: " + Math.round(y));
    if (drawing){
        ctx.lineWidth = event.pressure * lineWidth;
        if (selected_tool === "pen" || selected_tool === "eraser") {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        else if (selected_tool === "highlighter"){
            dist = Math.pow(x - last_point.x, 2) + Math.pow(y - last_point.y, 2);
            console.log(dist);
            if (dist > ctx.lineWidth * 5) {
                last_point.x = x;
                last_point.y = y;
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        }
    }
});

cnvs.addEventListener("pointerup", function () {
    drawing = false;
});

cnvs.addEventListener("pointerout", function () {
    drawing = false;
});

function showStatus(txt) {
    var status = document.querySelector("#status");
    status.innerHTML = txt;
}

document.querySelectorAll(".color").forEach(c => {
    c.addEventListener("click", function (event) {
        var color = window.getComputedStyle(event.target).backgroundColor;
        ctx.strokeStyle = color;
        tool_options[selected_tool].strokeStyle = color;
        if (selected_tool === "pen"){

            document.querySelector("#btnPen").style.borderBottom = "5px solid " + color;
        }
        else if (selected_tool === "highlighter"){
            document.querySelector("#btnHighlight").style.borderBottom = "5px solid " + color;
        }
    });
});

document.querySelector("#sldWidth").addEventListener("change", function (event) {
    lineWidth = this.value;
    ctx.lineWidth = lineWidth;
});

document.querySelector('#btnNew').addEventListener("click", function () {
    // create new page
    // clear board
    ctx.clearRect(0, 0, cnvs.clientWidth, cnvs.clientHeight);
});

document.querySelector("#btnEraser").addEventListener("click", function () {
    selected_tool = "eraser";
    load_options(selected_tool);
});

document.querySelector("#btnPen").addEventListener("click", function () {
    selected_tool = "pen";
    load_options(selected_tool);
    ctx.globalAlpha = 1;
});

document.querySelector("#btnHighlight").addEventListener("click", function () {
    selected_tool = "highlighter";
    load_options(selected_tool);
    ctx.globalAlpha = 0.01;
});

function load_options(tool) {
    lineWidth = tool_options[tool].lineWidth;
    document.querySelector("#sldWidth").value = tool_options[tool].lineWidth * 0.5; // mid-level pressure
    ctx.strokeStyle = tool_options[tool].strokeStyle;
    ctx.lineJoin = tool_options[tool].lineJoin;
    ctx.lineCap = tool_options[tool].lineCap;
}

load_options("pen");
document.querySelector("#btnPen").style.borderBottom = "5px solid " + tool_options["pen"].strokeStyle;
document.querySelector("#btnHighlight").style.borderBottom = "5px solid " + tool_options["highlighter"].strokeStyle;