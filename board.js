var cnvs = document.querySelector("#board");
var ctx = cnvs.getContext("2d");
var lineWidth = 2;
//ctx.translate(0.5, 0.5);
const resolution_scale = 2.0; // 1.0;
const device_scale = window.devicePixelRatio;
const canvas_scale = 1; //resolution_scale / device_scale;
let zoomRatio = 1;

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

cnvs.addEventListener("contextmenu", function (e){
    //disable rightclick menu on the canvas
    e.preventDefault();
    return false;
});

cnvs.addEventListener("pointerdown", function (event) {
    drawing = true;
    var x = event.clientX - cnvs.getBoundingClientRect().left;
    var y = event.clientY - cnvs.getBoundingClientRect().top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    current_path = [];
    current_path.push({x: x, y: y, lineWidth: lineWidth});
    ctx.lineWidth = lineWidth; // set line width according to the settings of the selected tool
    event.preventDefault(); //disable browser gestures
    document.activeElement.blur();
});

cnvs.addEventListener('pointermove', function (event) {
    var x = (event.clientX - cnvs.getBoundingClientRect().left);
    var y = (event.clientY - cnvs.getBoundingClientRect().top);
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
            let last_point = current_path[current_path.length-1];
            let dist1 = Math.sqrt(Math.pow(x - last_point.x, 2) + Math.pow(y - last_point.y, 2));
            // modify lineWidth acceleration for smoothing
            let newWidth = 0.5 * lineWidth / (dist1) + 0.5 * ctx.lineWidth
            // ctx.lineWidth is capped so it will not accept infinity
            ctx.lineWidth = newWidth;
            ctx.lineTo(x, y);
            let trans_mat = ctx.getTransform();
            ctx.rotate(tool_options.calligraphy.angle);
            ctx.scale(0.1, 1);
            ctx.stroke();
            ctx.setTransform(trans_mat); //restore transformations
            current_path.push({x: x, y: y, lineWidth: newWidth});
        }
        else if (selected_tool === "eraser") {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        else if (selected_tool === "highlighter"){
            let last_point = current_path[current_path.length-1];
            let dist = Math.pow(x - last_point.x, 2) + Math.pow(y - last_point.y, 2);
            if (dist > ctx.lineWidth * 5) {
                current_path.push({x: x, y: y});
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        }
    }
    event.preventDefault(); //disable browser gestures
});


cnvs.addEventListener("pointerup", function (e) {
    drawing = false;
    saveCurrentPage();
    e.preventDefault(); //disable browser gestures
});

cnvs.addEventListener("pointerout", function () {
    showStatus("");
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
            document.querySelectorAll("#background_colors button").forEach(c => { c.style.color = color; });
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

document.querySelectorAll("#background_colors button").forEach(c => {
    c.style.backgroundColor = c.value;
    c.style.color = tool_options["pen"].strokeStyle;
});

document.querySelectorAll("#background_colors button").forEach(c => {
    c.addEventListener("click", function (event) {
        cnvs.style.backgroundColor = this.value;
        document.querySelector("#bgcolor").style.backgroundColor = this.value;
        pages[pageIndex].style.backgroundColor = this.value;
        hideDropdownLists();
    });
});

document.querySelector("#sldWidth").addEventListener("change", function (event) {
    lineWidth = this.value;
    tool_options[selected_tool].lineWidth = lineWidth
});

document.querySelector('#btnNew').addEventListener("click", function () {
    createNewPage();
});

document.querySelector("#btnSave").addEventListener("click", function () {
    saveCurrentPage();
    let merged = document.createElement("canvas");
    let mrg_ctx = merged.getContext("2d");
    merged.width = cnvs.width;
    merged.height = cnvs.height;
    mrg_ctx.fillStyle = cnvs.style.backgroundColor || "#fff";
    console.log(mrg_ctx.fillStyle);
    mrg_ctx.fillRect(0, 0, merged.width, merged.height);
    if (cnvs.style.backgroundImage) {
        let background = new Image();
        background.onload = ()=>{
            mrg_ctx.drawImage(background, 0, 0);
            mrg_ctx.drawImage(cnvs, 0, 0);
            downloadCanvasImage(merged);
        }
        background.src = cnvs.style.backgroundImage.slice(4, -1).replace(/"/g, "");;
    }
    else {
        mrg_ctx.drawImage(cnvs, 0, 0);
        downloadCanvasImage(merged);
    }
});

function downloadCanvasImage(canvas)
{
    let downloadLink = document.createElement("a");
    downloadLink.setAttribute("download", "Page" + (pageIndex + 1) + ".png");
    downloadLink.href = canvas.toDataURL("image/png").replace(/^data:image\/[^;]/, 'data:application/octet-stream');
    downloadLink.click();
}


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
            showStatus("loading file: " + file_urls[i].name);
            fileReader.readAsArrayBuffer(file_urls[i]);
        }
        else
        {
            const fileReader = new FileReader();
            fileReader.onload = function () {
                const img = new Image;
                img.onload = function () {
                    insertPage(pageIndex + 1, img, img);
                    img.onload = null;
                };
                img.src = fileReader.result;
            }
            fileReader.readAsDataURL(file_urls[i]);
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
        const page_count = pdf.numPages;
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
                    let scale_to_fill = 1;
                    let viewport = page.getViewport({scale: 1});
                    const pageWidth = viewport.width;
                    const pageHeight = viewport.height;
                    scale_to_fill = (cnvs.parentElement.clientWidth) / (pageWidth);
                    if (pageHeight * scale_to_fill > cnvs.parentElement.clientHeight)
                    {
                        //vertical scrollbar is expected to appear, so we need to include its width
                        cnvs.parentElement.style.overflowY = "scroll";
                        scale_to_fill = (cnvs.parentElement.clientWidth) / (pageWidth);
                        cnvs.parentElement.style.overflowY = "auto";
                    }
                    if (scale_to_fill > 1)
                        viewport = page.getViewport({scale: scale_to_fill});
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
                        showStatus(progress + " of " + temp_cnvs_array.length)
                        if (progress === temp_cnvs_array.length)
                        {
                            showStatus("");
                            progress_bar.style.visibility = "hidden";
                            //all pages have been loaded
                            for (let c=0; c < temp_cnvs_array.length; c++)
                            {
                                const img = new Image();
                                img.src = temp_cnvs_array[c].toDataURL();
                                //create a new Opelea page from rendered pdf page
                                insertPage(pageIndex + c + 1, img, img);
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

function insertPage(pg_index, fg_img, bg_img, bg_color) {
    fg_img.className = "thumb_img";
    let newPage = document.createElement("div");
    newPage.style.backgroundColor = bg_color || "white";
    if (bg_img) {
        newPage.style.backgroundImage = `url(${bg_img.src})`;
    }
    newPage.appendChild(fg_img);
    pages.splice(pg_index, 0, newPage);
    if (pg_index > 0) {
        pages[pg_index - 1].after(newPage)
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
        document.querySelector("#thumbs").appendChild(newPage);
        // add event handler
        (function (idx) {
            newPage.onclick = function () {
                navigateTo(idx)
            }
        })(pg_index);
    }
    document.querySelector("#pgTotal").innerHTML = pages.length;
    document.querySelector("#pgNumber").max = pages.length;
}

function createNewPage() {
    if (pages.length > 0) {
        saveCurrentPage();
        clearBoard();
        cnvs.style.backgroundImage = null;
    }
    fillWorkspace();
    configureCanvas();
    pageIndex++;
    const img = new Image();
    img.src = cnvs.toDataURL();
    insertPage(pageIndex, img);
    setActivePage(pageIndex);
}

function saveCurrentPage() {
    var img = pages[pageIndex].firstChild;
    URL.revokeObjectURL(img.src);
    img.src = cnvs.toDataURL();
}

function clearBoard() {
    ctx.clearRect(0, 0, cnvs.clientWidth, cnvs.clientHeight);
}

document.querySelector("#pgNumber").addEventListener("change", e=>{
    navigateTo(e.target.value - 1);
});

function navigateTo(target_page) {
    if (target_page === pageIndex) {
        return;
    }
    saveCurrentPage();
    clearBoard();
    setActivePage(target_page);
    ctx.globalCompositeOperation = "source-over"; //needed when the eraser is active
    //load selected page onto the canvas
    cnvs.width = pages[target_page].firstChild.naturalWidth;
    cnvs.height = pages[target_page].firstChild.naturalHeight;
    cnvs.style.backgroundColor = pages[target_page].style.backgroundColor;
    cnvs.style.backgroundImage = pages[target_page].style.backgroundImage;
    document.querySelector("#btnExtend").disabled = Boolean(cnvs.style.backgroundImage);
    document.querySelector('#bgcolor').style.backgroundColor = pages[target_page].style.backgroundColor;
    ctx.drawImage(pages[target_page].firstChild, 0, 0);
    doSmartZoom();
    load_options(selected_tool);
    pageIndex = target_page;
}

function nextPage()
{
    if (pageIndex < pages.length - 1)
        navigateTo(pageIndex + 1);
}

function prevPage()
{
    if (pageIndex > 0)
        navigateTo(pageIndex - 1);
}

document.querySelector("#btnNext").addEventListener("click", nextPage);

document.querySelector("#btnPrev").addEventListener("click", prevPage);

document.addEventListener("keydown", function (e){
    if (e.code === "ArrowLeft" || e.code === "ArrowUp")
    {
        prevPage();
        e.preventDefault();
        return false;
    }
    else if(e.code === "ArrowRight" || e.code === "ArrowDown")
    {
        nextPage();
        e.preventDefault();
        return false;
    }
});

document.querySelector("#toolbox").addEventListener("keydown", (e)=>{
    //prevent bubbling keydown event
    e.stopPropagation();
});

function scrollThumbnailsToActivePage()
{
    let activeThumb = document.querySelector("#thumbs div.active");
    activeThumb.scrollIntoView({behavior: "smooth", block: "nearest"});
}

function setActivePage(index) {
    var active_page = document.querySelector("#thumbs div.active")
    if (active_page)
        active_page.classList.remove("active");
    pages[index].classList.add("active");
    scrollThumbnailsToActivePage();
    document.querySelector("#pgNumber").value = index + 1;
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

function fillWorkspace()
{
    cnvs.parentElement.style.overflow = "hidden";
    cnvs.width = cnvs.parentElement.clientWidth;
    cnvs.height = cnvs.parentElement.clientHeight;
    cnvs.parentElement.style.overflow = "auto";
    scaleCanvas(1);
}

function configureCanvas()
{
    // reset the lineCap and lineJoin properties to "round" after resizing the canvas
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.resetTransform();
    //ctx.translate(0.5, 0.5);
    // Normalize coordinate system to use scaled pixels.
    ctx.scale(1 / zoomRatio, 1 / zoomRatio);
    load_options(selected_tool);
}

function scaleCanvas(ratio)
{
    zoomRatio = ratio;
    cnvs.style.width = cnvs.width * ratio + "px";
    cnvs.style.height = cnvs.height * ratio + "px";
    configureCanvas();
    document.querySelector("#btnZoom").innerHTML = Math.round(100 * ratio) + "%";
}

function scaleToFill()
{
    //fit canvas to workspace width
    cnvs.parentElement.style.overflow = "hidden"; //don't include scrollbar width in area calculations
    let ratio = cnvs.parentElement.clientWidth / (cnvs.width);
    if (ratio * cnvs.height > cnvs.parentElement.clientHeight) {
        cnvs.parentElement.style.overflowY = "scroll"; // include a vertical scrollbar
        ratio = cnvs.parentElement.clientWidth / (cnvs.width);
    }
    cnvs.parentElement.style.overflow = "auto";
    scaleCanvas(ratio);
}

function scaleToFit()
{
    cnvs.parentElement.style.overflow = "hidden"; //don't include scrollbar width in area calculations
    let scaleHeight = cnvs.parentElement.clientHeight / (cnvs.height);
    let scaleWidth = cnvs.parentElement.clientWidth / (cnvs.width)
    if (scaleWidth < scaleHeight)
    {
        if (scaleWidth * cnvs.height > cnvs.parentElement.clientHeight) {
            cnvs.parentElement.style.overflowY = "scroll";
            scaleWidth = cnvs.parentElement.clientWidth / (cnvs.width);
        }
        scaleCanvas(scaleWidth);
    }
    else
    {
        if (scaleHeight * cnvs.width > cnvs.parentElement.clientWidth) {
            cnvs.parentElement.style.overflowX = "scroll";
            scaleHeight = cnvs.parentElement.clientHeight / (cnvs.height);
        }
        scaleCanvas(scaleHeight);
    }
    cnvs.parentElement.style.overflow = "auto";
}

function doSmartZoom()
{
    if (cnvs.width > cnvs.height)
    {
        scaleToFit();
    }
    else {
        scaleToFill();
    }
}

document.querySelectorAll("#zoom_list button").forEach(z=> {
    z.addEventListener("click", e => {
        console.log("Canvas:", cnvs.width, cnvs.height);
        console.log("Workspace:", cnvs.parentElement.clientWidth, cnvs.parentElement.clientHeight);
        if (e.target.value === 'w')
        {
            scaleToFill();
        }
        else if (e.target.value === 'p')
        {
            scaleToFit();
        }
        else
        {
            scaleCanvas(e.target.value);
        }
        hideDropdownLists();
    });
});

document.querySelector("#btnFullScreen").addEventListener("click", e=>{
    if (document.fullscreenEnabled)
    {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    else
    {
        alert("Your browser doesn't support switching to fullscreen!")
    }
});

document.querySelector("#btnExtend").addEventListener("click", e=>{
    let css_w = parseFloat(window.getComputedStyle(cnvs).width);
    let css_h = parseFloat(window.getComputedStyle(cnvs).height);
    let snapshot = ctx.getImageData(0, 0, cnvs.width, cnvs.height);
    if (css_w < cnvs.parentElement.clientWidth)
    {
        cnvs.width *= cnvs.parentElement.clientWidth / css_w;
        cnvs.style.width = cnvs.width * zoomRatio + "px";
    }
    if (css_h < cnvs.parentElement.clientHeight)
    {
        cnvs.height *= cnvs.parentElement.clientHeight / css_h;
        cnvs.style.height = cnvs.height * zoomRatio + "px";
    }
    ctx.putImageData(snapshot, 0, 0);
    configureCanvas();
});

document.querySelector("#btnPen").style.borderBottom = "5px solid " + tool_options["pen"].strokeStyle;
document.querySelector("#btnCalligraphy").style.borderBottom = "5px solid " + tool_options["calligraphy"].strokeStyle;
document.querySelector("#btnHighlight").style.borderBottom = "5px solid " + tool_options["highlighter"].strokeStyle;
document.querySelector("#bgcolor").style.backgroundColor = "white"
document.querySelector("#bgcolor").style.color = tool_options["pen"].strokeStyle;
createNewPage();