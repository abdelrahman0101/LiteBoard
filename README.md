# Opelea
A simple light-weight browser-based whiteboard application. 

## Current Features:
* A set of commonly needed drawing tools:
  1. Standard pen with a circular stroke.
  2. Calligraphic pen with an elliptical stroke supporting dynamic line width based on pressure and pointer acceleration. Currently configured for use in writing Naskh and Tholoth with a rotation angle of 70 degrees.
  3. Highlighter pen for highlighting content with a transparent color.
  4. Eraser with a transparent background.

* Support for multiple pages.
* Import a single image into the active page.
* Export the active page to an image in a new window.
* Change the background color of the board anytime independently from its content.

## Currently known bugs:
1. Switching to another non-empty page while the eraser tool is active erases the destination page.
2. Canvas doesn't fit the browser window in Chrome/Edge.
3. Calligraphic pen is not working when Windows Ink is enabled with some graphics tablets e.g. Huion Kamvas 13.

## Planned Features:
1. Custom cursors for different tools.
2. ~~Interactive styles for the tool buttons to indicate the active tool.~~ **Done**
3. ~~Use custom icons for tool buttons instead of (emoji) unicode characters.~~ **Done**
4. Use a responsive design to support mobile devices.
5. A new icon for the app and website.
6. Select and move any part of the image.
7. Change pen angle with the calligraphic pen.
8. Import multiple images to multiple pages.
9. Import multi-page PDF files based on PDF.js.
10. Custom color picker.
11. Integration with cloud-based storage services e.g. Google Drive, to store and import files.
