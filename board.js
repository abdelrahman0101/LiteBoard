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
        alpha: 1
    },
    "calligraphy": {
        lineWidth: 10,
        strokeStyle: '#000000',
        alpha: 1
    },
    "highlighter" : {
        lineWidth: 10,
        strokeStyle: "#FFFF00",
        alpha: 0.01
    },
    "eraser": {
        lineWidth: 30,
        strokeStyle: '#FFFFFF', // color is irrelevant, but needs to be opaque
        alpha: 1
    },

};

var pages = [];
var pageIndex = -1;

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
    if (drawing) {
        ctx.lineWidth = event.pressure * lineWidth;
        if (selected_tool === "pen") {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        else if (selected_tool === "calligraphy")
        {
            var dist = dist = Math.sqrt(Math.pow(event.movementX, 2) + Math.pow(event.movementY, 2));
            // modify lineWidth by pressure and acceleration with smoothing
            ctx.lineWidth = 0.8 * event.pressure * lineWidth / (dist) + (0.2 * ctx.lineWidth); 
            ctx.lineTo(x, y);
            ctx.rotate(Math.PI / 9);
            ctx.scale(0.1, 1);
            ctx.stroke();
            ctx.resetTransform();
        }
        else if (selected_tool == "eraser") {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        else if (selected_tool === "highlighter"){
            var dist = Math.pow(x - last_point.x, 2) + Math.pow(y - last_point.y, 2);
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
        if (selected_tool == "eraser") {
            selected_tool = "pen";
            load_options("pen");
        }
        ctx.strokeStyle = color;
        if (selected_tool === "pen" || selected_tool === "calligraphy") {
            // both tools must have the same pen color for simplicity
            tool_options["pen"].strokeStyle = color;
            tool_options["calligraphy"].strokeStyle = color;
            document.querySelectorAll("#bgcolor option").forEach(c => { c.style.color = color; });
            document.querySelector("#bgcolor").style.color = color;
            document.querySelector("#btnPen").style.borderBottom = "5px solid " + color;
            document.querySelector("#btnCalligraphy").style.borderBottom = "5px solid " + color;
        }
        else if (selected_tool === "highlighter") {
            tool_options["highlighter"].strokeStyle = color;
            document.querySelector("#btnHighlight").style.borderBottom = "5px solid " + color;
        }
    });
});

document.querySelectorAll("#bgcolor option").forEach(c => {
    c.style.backgroundColor = c.value;
    c.style.color = c.value;
});

document.querySelector("#bgcolor").addEventListener("change", function (event) {
    cnvs.style.backgroundColor = this.value;
    this.style.backgroundColor = this.value;
});

document.querySelector("#sldWidth").addEventListener("change", function (event) {
    lineWidth = this.value;
    tool_options[selected_tool].lineWidth = lineWidth
});

document.querySelector('#btnNew').addEventListener("click", function () {
    newPage();
});

document.querySelector("#btnSave").addEventListener("click", function () {
    saveCurrentPage();
    window.open(cnvs.toDataURL("image/png"));
});

document.querySelector("#btnNext").addEventListener("click", function () {
    if (pageIndex < pages.length - 1)
        navigateTo(pageIndex + 1);
})

document.querySelector("#btnPrev").addEventListener("click", function () {
    if (pageIndex > 0)
        navigateTo(pageIndex - 1);
})

document.querySelector("#btnEraser").addEventListener("click", function () {
    load_options("eraser");
});

document.querySelector("#btnClear").addEventListener("click", function () {
    // TODO: need confirmation first
    clearBoard();
});

document.querySelector("#btnPen").addEventListener("click", function () {
    load_options("pen");
});

document.querySelector("#btnCalligraphy").addEventListener("click", function () {
    load_options("calligraphy");
});

document.querySelector("#btnHighlight").addEventListener("click", function () {
    load_options("highlighter");
});

document.querySelector("#btnImport").addEventListener("click", function () {
    document.querySelector("#file_importer").click();
});

document.querySelector("#file_importer").addEventListener("change", function (event) {
    var img = new Image;
    img.onload = function () {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(event.target.files[0]);
});

function newPage() {
    if (pages.length > 0) {
        saveCurrentPage();
        clearBoard();
    }
    var img = new Image();
    img.src = cnvs.toDataURL();
    img.className = "thumb_img";
    pageIndex++;
    pages.splice(pageIndex, 0, img);
    if (pageIndex > 0) {
        pages[pageIndex - 1].after(img)
        // fix indecies in event handlers
        for (var i = pageIndex; i < pages.length; i++) {
            (function (idx) {
                pages[i].onclick = function () {
                    navigateTo(idx)
                }
            })(i);
        }
    }
    else {
        // First inserted page
        document.querySelector("#thumbs").appendChild(img);
        // add event handler
        (function (idx) {
            img.onclick = function () {
                navigateTo(idx)
            }
        })(pageIndex);
    }
    setActivePage(pageIndex);
}

function saveCurrentPage() {
    var img = pages[pageIndex];
    URL.revokeObjectURL(img.src);
    img.src = cnvs.toDataURL();
}

function clearBoard() {
    ctx.clearRect(0, 0, cnvs.clientWidth, cnvs.clientHeight);
}

function navigateTo(target_page) {
    if (target_page == pageIndex) {
        return;
    }
    saveCurrentPage();
    clearBoard();
    setActivePage(target_page);
    
    ctx.drawImage(pages[target_page], 0, 0);
    pageIndex = target_page;
}

function setActivePage(index) {
    var active_page = document.querySelector("#thumbs img.active")
    if (active_page)
        active_page.classList.remove("active");
    pages[index].classList.add("active");
}

function load_options(tool) {
    if (tool == "eraser") {
        ctx.globalCompositeOperation = "destination-out"
    } else {
        ctx.globalCompositeOperation = "source-over"
    }
    selected_tool = tool;
    lineWidth = tool_options[tool].lineWidth;
    document.querySelector("#sldWidth").value = tool_options[tool].lineWidth;
    ctx.strokeStyle = tool_options[tool].strokeStyle;
    ctx.globalAlpha = tool_options[tool].alpha;
}


// get canvas size that fits the window
var css_w = window.getComputedStyle(cnvs).width;
var css_h = window.getComputedStyle(cnvs).height;
// fit drawing context size to canvas size
cnvs.width = css_w.substring(0, css_w.length - 2);
cnvs.height = css_h.substring(0, css_h.length - 2);
// fix canvas size
cnvs.style.width = css_w;
cnvs.style.height = css_h;

load_options("pen");
document.querySelector("#btnPen").style.borderBottom = "5px solid " + tool_options["pen"].strokeStyle;
document.querySelector("#btnCalligraphy").style.borderBottom = "5px solid " + tool_options["calligraphy"].strokeStyle;
document.querySelector("#btnHighlight").style.borderBottom = "5px solid " + tool_options["highlighter"].strokeStyle;
document.querySelector("#bgcolor").value = "white"
ctx.lineCap = "round";
ctx.lineJoin = "round";

newPage();