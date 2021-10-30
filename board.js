var cnvs = document.querySelector("#board");
var ctx = cnvs.getContext("2d");
var lineWidth = 2;
//ctx.translate(0.5, 0.5);
const canvas_resolution_scale = 1.0;
var drawing = false;
var x = 0;
var y = 0;

var page_list = [];
var selected_tool = "pen";

var tool_options = {
    "select": {

    },
    "pen": {
        lineWidth: 2,
        strokeStyle: '#000000',
        alpha: 1
    },
    "calligraphy": {
        lineWidth: 3,
        strokeStyle: '#000000',
        alpha: 1,
        angle: Math.PI / 9
    },
    "highlighter" : {
        lineWidth: 5,
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

let current_path = [];

cnvs.addEventListener("pointerdown", function (event) {
    drawing = true;
    var x = event.clientX - cnvs.getBoundingClientRect().left;
    var y = event.clientY - cnvs.getBoundingClientRect().top;
    ctx.beginPath();
    ctx.moveTo(x * canvas_resolution_scale, y * canvas_resolution_scale);
    current_path = [];
    current_path.push({x: x, y: y, lineWidth: lineWidth});
    ctx.lineWidth = lineWidth; // set line width according to the settings of the selected tool
});

cnvs.addEventListener('pointermove', function (event) {
    var x = (event.clientX - cnvs.getBoundingClientRect().left) * canvas_resolution_scale;
    var y = (event.clientY - cnvs.getBoundingClientRect().top) * canvas_resolution_scale;
    //showStatus("X: " + Math.round(x) + ", Y: " + Math.round(y));
    if (drawing) {
        //console.log("Pen pressure: " + event.pressure);
        //const pressure = (event.pressure + 0.5);
        if (selected_tool === "pen") {
            ctx.lineTo(x, y);
            ctx.stroke();
            current_path.push({x: x, y: y, lineWidth: lineWidth});
        }
        else if (selected_tool === "calligraphy")
        {
            let dist1 = Math.sqrt(Math.pow(event.movementX, 2) + Math.pow(event.movementY, 2));

            // modify lineWidth acceleration for smoothing
            let newWidth = (0.5 * lineWidth / (dist1)) + 0.5 * ctx.lineWidth;

            ctx.lineWidth = newWidth;
            ctx.lineTo(x, y);
            ctx.rotate(tool_options.calligraphy.angle);
            ctx.scale(0.1, 1);
            ctx.stroke();
            ctx.resetTransform();
            current_path.push({x: x, y: y, lineWidth: newWidth});
        }
        else if (selected_tool === "eraser") {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        else if (selected_tool === "highlighter"){
            let last_point = current_path[current_path.length-1];
            var dist = Math.pow(x - last_point.x, 2) + Math.pow(y - last_point.y, 2);
            if (dist > ctx.lineWidth * 5) {
                current_path.push({x: x, y: y});
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        }
    }
});

function strokeCalligraphyPoint(x, y){
    ctx.lineTo(x, y);
    ctx.rotate(tool_options.calligraphy.angle);
    ctx.scale(0.1, 1);
    ctx.stroke();
    ctx.resetTransform();
}


cnvs.addEventListener("pointerup", function () {
    drawing = false;
    saveCurrentPage();
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
        if (selected_tool === "eraser") {
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
    let downloadLink = document.createElement("a");
    downloadLink.setAttribute("download", "Page" + (pageIndex + 1) + ".png");
    downloadLink.href = cnvs.toDataURL("image/png").replace(/^data:image\/[^;]/, 'data:application/octet-stream');
    downloadLink.click();
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
    saveCurrentPage();
});

document.querySelector("#btnPen").addEventListener("click", function () {
    load_options("pen");
});

document.querySelector("#btnCalligraphy").addEventListener("click", function () {
    load_options("calligraphy");
});

document.querySelectorAll("#calligraphy_angles button").forEach((item)=>{
    item.addEventListener("click", function (e){
        document.querySelector("#calligraphy_angles button.enabled").classList.remove("enabled");
        e.target.classList.add("enabled");
        const angle = Number(e.target.value);
        tool_options.calligraphy.angle = (90 - angle) * Math.PI / 180;
        hideDropdownLists();
    });
});

document.querySelectorAll(".dropdown_container > button").forEach((btn)=>{
    btn.addEventListener("click", (e)=> {
        document.querySelector("#float_screen").style.visibility = "visible";
        e.target.nextElementSibling.style.visibility = "visible";
    });
});

function hideDropdownLists()
{
    document.querySelectorAll(".dropdown_list").forEach((lst)=>{
        lst.style.visibility = "hidden";
        document.querySelector("#float_screen").style.visibility = "hidden";
    });
}

//hide dropdown lists when they lose focus
document.querySelector("#float_screen").addEventListener("click", function (){
    hideDropdownLists();
});

document.querySelector("#btnHighlight").addEventListener("click", function () {
    load_options("highlighter");
});

document.querySelector("#btnImport").addEventListener("click", function () {
    document.querySelector("#file_importer").click();
});

document.querySelector("#file_importer").addEventListener("change", function (event) {
    const file_urls = event.target.files;
    for (let i=0; i < file_urls.length; i++)
    {
        const ext = file_urls[i].name.slice(-4).toLowerCase();
        if (ext === '.pdf')
        {
            const fileReader = new FileReader();
            fileReader.onload = function() {
                const typedarray = new Uint8Array(this.result);
                loadPDF(typedarray);
            };
            fileReader.readAsArrayBuffer(file_urls[i]);
        }
        else
        {
            let img = new Image;
            img.onload = function () {
                insertPageFromImage(img, pageIndex + 1);
                img.onload = null;
            };
            img.src = URL.createObjectURL(file_urls[i]);
        }
    }
});

function loadPDF(pdfData)
{
    // Loaded via <script> tag, create shortcut to access PDF.js exports.
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    // The workerSrc property shall be specified.
    pdfjsLib.GlobalWorkerOptions.workerSrc = './pdfjs-2.10.377-dist/build/pdf.worker.js';
    const loadingTask = pdfjsLib.getDocument(pdfData);
    loadingTask.promise.then(function(pdf) {
        console.log('PDF loaded');
        const page_count = pdf.numPages;
        console.log("Number of pages:", page_count);
        /*
            Pages are rendered asynchronously.
            We need to insert PDF pages in order, but some pages take more time to render than others
         */
        let temp_cnvs_array = new Array(page_count);
        let progress = 0;
        const progress_bar = document.querySelector("#fileProgress");
        progress_bar.value = 0;
        progress_bar.style.visibility = "visible"
        for (let i=1; i<=page_count;i++)
        {
            const temp_cnvs = document.createElement('canvas');
            const context = temp_cnvs.getContext('2d');
            (function (pdf_idx){
                //create a new scope to preserve PDF page index
                pdf.getPage(i).then(function(page) {
                    console.log('Page loaded', i);
                    let scale_to_fit = 1;
                    let viewport = page.getViewport({scale: 1});
                    const pageWidth = viewport.width;
                    const pageHeight = viewport.height;
                    if (pageHeight > pageWidth)
                    {
                        scale_to_fit = cnvs.parentElement.clientWidth / pageWidth;
                    }
                    else
                    {
                        scale_to_fit = cnvs.parentElement.clientHeight / pageHeight;
                    }
                    viewport = page.getViewport({scale: scale_to_fit * canvas_resolution_scale});

                    // Prepare canvas using PDF page dimensions
                    temp_cnvs.height = viewport.height;
                    temp_cnvs.width = viewport.width;
                    // Render PDF page into canvas context
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    const renderTask = page.render(renderContext);
                    renderTask.promise.then(function () {
                        temp_cnvs_array[i - 1] = temp_cnvs;
                        progress++;
                        progress_bar.value = progress * 100 / temp_cnvs_array.length;
                        if (progress === temp_cnvs_array.length)
                        {
                            progress_bar.style.visibility = "hidden";
                            //all pages have been loaded
                            for (let c=0; c < temp_cnvs_array.length; c++)
                            {
                                const img = new Image();
                                img.src = temp_cnvs_array[c].toDataURL();
                                //create a new Opelea page from rendered pdf page
                                insertPageFromImage(img, pageIndex + c + 1);
                            }
                        }
                        else {
                            //multiple files could be loading
                            //TODO: Should we have multiple progress bars?
                            progress_bar.style.visibility = "visible";
                        }
                    });
                });
            })(i);
        }
    }, function (reason) {
        // PDF loading error
        console.error(reason);
    });
}

function pasteFromClipboard(e){
    if (!e.clipboardData || !e.clipboardData.items){
        return;
    }
    let items = e.clipboardData.items;
    if (items[0].type.indexOf("image") === -1)
        return;
    let blob = items[0].getAsFile();
    let img = new Image;
    img.onload = function () {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(img.src);
        saveCurrentPage();
    };
    img.src = URL.createObjectURL(blob);
}

//document.querySelector("#btnPaste").addEventListener("click", pasteFromClipboard);
window.addEventListener("paste", pasteFromClipboard);

//show active tool style
document.querySelectorAll(".tool").forEach((t)=>{
    t.addEventListener("click", function (e){
        const current = document.querySelector(".tool.enabled");
            if (current)
                current.classList.remove("enabled");
        e.target.classList.add("enabled");
    });
});

function insertPageFromImage(img, pg_index){
    img.className = "thumb_img";
    pages.splice(pg_index, 0, img);
    if (pg_index > 0) {
        pages[pg_index - 1].after(img)
        // fix indices in event handlers
        for (var i = pg_index; i < pages.length; i++) {
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
        })(pg_index);
    }
}

function newPage() {
    if (pages.length > 0) {
        saveCurrentPage();
        clearBoard();
    }
    pageIndex++;
    const img = new Image();
    img.src = cnvs.toDataURL();
    insertPageFromImage(img, pageIndex);
    setActivePage(pageIndex);
}

function saveCurrentPage() {
    var img = pages[pageIndex];
    URL.revokeObjectURL(img.src);
    img.src = cnvs.toDataURL();
}

function clearBoard() {
    ctx.clearRect(0, 0, cnvs.clientWidth * canvas_resolution_scale, cnvs.clientHeight * canvas_resolution_scale);

}

function navigateTo(target_page) {
    if (target_page === pageIndex) {
        return;
    }
    saveCurrentPage();
    clearBoard();
    setActivePage(target_page);
    ctx.globalCompositeOperation = "source-over"; //needed when the eraser is active
    //load selected page onto the canvas
    cnvs.width = pages[target_page].naturalWidth;
    cnvs.height = pages[target_page].naturalHeight;
    cnvs.style.width = cnvs.width / canvas_resolution_scale + "px";
    cnvs.style.height = cnvs.height / canvas_resolution_scale + "px";
    // reset the lineCap and lineJoin properties to "round" after resizing the canvas
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.drawImage(pages[target_page], 0, 0);
    load_options(selected_tool);
    pageIndex = target_page;
}

function setActivePage(index) {
    var active_page = document.querySelector("#thumbs img.active")
    if (active_page)
        active_page.classList.remove("active");
    pages[index].classList.add("active");
}

function load_options(tool) {
    if (tool === "eraser") {
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
const css_w = window.getComputedStyle(cnvs).width;
const css_h = window.getComputedStyle(cnvs).height;
// fit drawing context size to canvas size
cnvs.width = css_w.substring(0, css_w.length - 2) * canvas_resolution_scale;
cnvs.height = css_h.substring(0, css_h.length - 2) * canvas_resolution_scale;
console.log(cnvs.width, cnvs.height);
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