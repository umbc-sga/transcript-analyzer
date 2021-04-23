// weights for each grade value
const GRADE_INFO = [
    {
        letter: "A",
        weight: 4
    },
    {
        letter: "B",
        weight: 3
    },
    {
        letter: "C",
        weight: 2
    },
    {
        letter: "D",
        weight: 1
    },
    {
        letter: "E",
        weight: 0
    }
];

const ATTRIBUTES = [
    {
        id: "department",
        name: "Department",
        type: "string"
    },
    {
        id: "courseNumber",
        name: "Course Number",
        type: "number"
    },
    {
        id: "name",
        name: "Course Name",
        type: "string"
    },
    {
        id: "semester",
        name: "Semester",
        type: "string"
    },
    {
        id: "credits",
        name: "Credits",
        type: "number"
    },
    {
        id: "grade",
        name: "Grade",
        type: "string"
    }
];

const grid = new gridjs.Grid({
    columns: ATTRIBUTES,
    data: [{
        "department": "",
        "name": "",
        "courseNumber": "",
        "credits": "",
        "grade": "",
    }],
    fixedHeader: true,
    pagination: {
        enabled: true,
        limit: 20
    },
    resizable: true,
    sort: true
});

// global variable to store course data
const courses = [];

// references to readout elements
const cumulativeGpaReadoutEl = document.getElementById("gpa");
const numCreditsReadoutEl = document.getElementById("numCredits");

// references to the filter elements
const attributeSelect = document.getElementById("attributeSelect");
const relationSelect = document.getElementById("relationSelect");
const comparisonValueInput = document.getElementById("comparisonValue");
const filterButton = document.getElementById("filterBtn");
const resetButton = document.getElementById("resetBtn");

// references to the transcript input elements
const transcriptInput = document.getElementById("transcriptInput");
const importCoursesButtons = document.getElementById("importCourses");

/**
 * Initialize the UI components appearance and functionality.
 */
(async function initUI() {
    // start off with an example course div
    updateNumberReadouts();

    // create the Grid.js table
    grid.render(document.getElementById("wrapper"));
    
    // populate the filter select elements
    populateSelects();

    // bind functionality to filter buttons
    bindFilterButtonActions();   

    // bind the add course div function to the add course button
    importCoursesButtons.onclick = importCourses;
})();

/**
 * Bind actions to the Apply Filter and Reset filer buttons.
 */
function bindFilterButtonActions() {
    filterBtn.onclick = () => {
        const attribute = ATTRIBUTES.find(x => x.name == attributeSelect.value);
        const prop = attribute?.id;
        const relation = relationSelect.value;
        const value = comparisonValueInput.value;

        // set data = grid.config.data to stack filters
        const data = courses;
        const filteredData = [];

        // property is a dummy attribute for UX purposes
        // we cannot filter with no courses
        if (!attribute || attribute == "property" || courses.length === 0)
        {
            return;
        }

        if (relation == "equals")
        {
            filteredData.push(...data.filter(x => x[prop] == value));
        }
        else if (relation == "is less than")
        {
            if (attribute.type == "number")
            {
                filteredData.push(...data.filter(x => x[prop] < parseInt(value, 10)));
            }
            // this query doesn't make sense if the attribute is type is non-numeric
            else
            {
                return;
            }
        }
        else if (relation == "is less than or equal to")
        {
            if (attribute.type == "number")
            {
                filteredData.push(...data.filter(x => x[prop] <= parseInt(value, 10)));
            }
            // this query doesn't make sense if the attribute is type is non-numeric
            else
            {
                return;
            }
        }
        else if (relation == "is greater than")
        {
            if (attribute.type == "number")
            {
                filteredData.push(...data.filter(x => x[prop] > parseInt(value, 10)));
            }
            // this query doesn't make sense if the attribute is type is non-numeric
            else
            {
                return;
            }
        }
        else if (relation == "is greater than or equal to")
        {
            if (attribute.type == "number")
            {
                filteredData.push(...data.filter(x => x[prop] >= parseInt(value, 10)));
            }
            // this query doesn't make sense if the attribute is type is non-numeric
            else
            {
                return;
            }
        }

        // update the table with course data
        grid.updateConfig({
            data: filteredData
        }).forceRender();

        // update credit count and GPA
        updateNumberReadouts();
    }

    resetBtn.onclick = () => {
        // reset selected attribute
        attributeSelect.selectedIndex = 0;

        // clear comparison value
        comparisonValueInput.value = "";

        // update the table with course data
        grid.updateConfig({
            data: courses
        }).forceRender();

        // update credit count and GPA
        updateNumberReadouts();
    }
}

/**
 * Populate the attribute and relation select elements for filtering.
 */
function populateSelects() {
    // populate attribute select
    const attributes = [ "property", ...ATTRIBUTES.map(x => x.name) ];
    attributes.forEach(attr => {
        attributeSelect.add(createElement(attributeSelect, "option", {
            text: attr
        }));
    });

    // populate relation select
    const relations = ["equals", "is less than", "is less than or equal to", "is greater than", "is greater than or equal to"];
    relations.forEach(relation => {
        relationSelect.add(createElement(relationSelect, "option", {
            text: relation
        }));
    });
}

/**
 * Recalculate and update the credit and GPA readouts based on what is being displayed in the table.
 */
function updateNumberReadouts() {
    // calculate GPA and update 
    cumulativeGpaReadoutEl.innerText = calculateGPA(grid.config.data);

    // get number of credits and update num credits readout
    numCreditsReadoutEl.textContent = grid.config.data.reduce((a, b) => a + b.credits, 0);
}

/**
 * Parse a PDF and extract the text contents from the pages.
 * From: https://github.com/ffalt/pdf.js-extract/blob/main/lib/index.js
 * @param {String} base64Data
 * @returns {Object} data
 */
async function parsePDF(base64PdfData) {
    const options = {};
    const pdf = {
        meta: {},
        pages: []
    };

    // Will be using promises to load document, pages and misc data instead of callback.
    const doc = await pdfjsLib.getDocument({ data: base64PdfData }).promise;
    const firstPage = (options && options.firstPage) ? options.firstPage : 1;
    const lastPage = Math.min((options && options.lastPage) ? options.lastPage : doc.numPages, doc.numPages);

    pdf.pdfInfo = doc.pdfInfo;

    const promises = [
        doc.getMetadata().then(data => {
            pdf.meta = data;
            if (pdf.meta.metadata && pdf.meta.metadata._metadataMap) {
                // convert to old data structure Map => Object
                pdf.meta.metadata = {
                    _metadata: Array.from(pdf.meta.metadata._metadataMap.entries()).reduce((main, [key, value]) => ({ ...main, [key]: value }), {})
                };
            }
        })
    ];

    const loadPage = pageNum => doc.getPage(pageNum).then(page => {
        const viewport = page.getViewport({ scale: 1.0 });

        const pag = {
            pageInfo: {
                num: pageNum,
                scale: viewport.scale,
                rotation: viewport.rotation,
                offsetX: viewport.offsetX,
                offsetY: viewport.offsetY,
                width: viewport.width,
                height: viewport.height
            }
        };

        pdf.pages.push(pag);

        const normalizeWhitespace = !!(options && options.normalizeWhitespace === true);
        const disableCombineTextItems = !!(options && options.disableCombineTextItems === true);

        return page.getTextContent({ normalizeWhitespace, disableCombineTextItems }).then((content) => {
            // Content contains lots of information about the text layout and styles, but we need only strings at the moment
            pag.content = content.items.map(item => {
                const tm = item.transform;

                let x = tm[4];
                let y = pag.pageInfo.height - tm[5];

                if (viewport.rotation === 90) {
                    x = tm[5];
                    y = tm[4];
                }

                // see https://github.com/mozilla/pdf.js/issues/8276
                const height = Math.sqrt(tm[2] * tm[2] + tm[3] * tm[3]);

                return {
                    x: x,
                    y: y,
                    str: item.str,
                    dir: item.dir,
                    width: item.width,
                    height: height,
                    fontName: item.fontName
                };
            });
        })
    });

    for (let i = firstPage; i <= lastPage; i++) {
        promises.push(loadPage(i));
    }

    await Promise.all(promises);

    return pdf;
}

/**
 * Import the courses into the GPA calculator from the PDF.
 */
async function importCourses() {
    // make sure that the user has attached a file
    if (transcriptInput.files.length === 0)
    {
        return;
    }

    // get the transcript file attachment
    const transcript = transcriptInput.files[0];

    // create a file reader and read file in base64 encoding
    const fileReader = new FileReader();
    fileReader.readAsDataURL(transcript);

    // bind callback to file reader load event
    fileReader.onload = async () => {
        // clear file input
        transcriptInput.value = "";

        // get data into base64 encoding and convert to binary to parse the PDF
        const data = await parsePDF(atob(fileReader.result.replace("data:application/pdf;base64,", "")));

        // go through every page
        for (const page of data.pages) {
            // get the lines of the PDF (lines is an array of line items arrays) by grouping by y-coordinate
            const sortedRawLines = Object.values(fuzzyGroupByYPos(page.content, 0))
                // order lines by y-coordinate in ascending order
                .sort((a, b) => a[0].y - b[0].y)
                // order items within lines by x-coordinate in ascending order
                .map(x => x.sort((a, b) => a.x - b.x));

            // put together line strings
            const reconstructedLines = sortedRawLines
                .map(line => line.reduce((a, b) => a + " " + b.str, ""));

            // go through all the reconstructed lines
            const coursesAndSemesterLines = reconstructedLines
                // filter out all the non-course lines
                .filter(line => {
                    return (line.includes(".00") || line.includes("Fall") || line.includes("Spring")
                            || line.includes("Summer") || line.includes("Winter")) 
                        && !line.includes("Overall Cum GPA")
                        && !line.includes("UMBC Cum GPA") && !line.includes("UMBC Term GPA")
                        && !line.includes("Overall Term GPA") && !line.includes("Test Trans GPA")
                });

            let semester;
            while (coursesAndSemesterLines.length)
            {
                const line = coursesAndSemesterLines.shift();

                // if is a course line
                if (line.includes(".00"))
                {
                    // filter out empty strings
                    const tokens = line.split(" ").filter(x => x != "");

                    // reconstruct the course code from the tokens
                    const [department, courseNum] = tokens;
                    const courseCode = `${department} ${courseNum}`;
                    tokens.splice(0, 2);

                    /**
                     * Reconstruct the course name from the tokens. This is harder thant it looks because we don't know how long
                     * a course name will be and from the other end it can be either 3 or 4 columns depending if the course has a grade or not.
                     */
                    const courseNameTokens = [];
                    while (isNaN(parseFloat(tokens[0]))) 
                    {
                        courseNameTokens.push(tokens[0]);
                        tokens.shift();
                    }
                    const courseName = courseNameTokens.join(" ");

                    // get the credit and grade information for the course
                    let attempted, grade;
                    if (tokens.length == 4)
                    {
                        // skip earned (and ignore points)
                        [ attempted, , grade ] = tokens;
                    }
                    // if the course has no grade yet
                    else if (tokens.length == 3) 
                    {
                        // ignore earned and points
                        [ attempted ] = tokens;
                    }

                    // create a course object
                    const course = {
                        department: department,
                        name: courseName,
                        courseNumber: courseNum,
                        semester: semester,
                        credits: parseInt(attempted, 10),
                        grade: grade || "-",
                        completed: true
                    };

                    // prevent duplicate credit transfers (APs are sometimes weird)
                    if (grade != "T" || grade == "T" && courses.find(x => x.name == courseName) == null)
                    {
                        courses.push(course);
                    }
                }
                else
                {
                    semester = line.trim();
                }
            }
        }
        
        // update the table with course data
        grid.updateConfig({
            data: courses
        }).forceRender();

        // calculate num credits and GPA
        updateNumberReadouts();
    }   
}

/**
 * Calculate the grade point average for a list of courses.
 * @param {Object[]} courses 
 * @returns {String} gpa
 */
function calculateGPA(courses) {
    // track the number of grade points the student has and the credit number
    let gradePoints = 0, creditsTaken = 0;

    // go through every course element
    courses
        .forEach(course => {
            // get the credit number and course grade information from the input elements
            const credits = course.credits;
            const grade = course.grade;

            // if the course information is complete
            if (credits && !["-", "T", "P"].includes(grade)) 
            {
                // find the grade weight for the corresponding letter grade
                const gradeWeight = GRADE_INFO.find(x => x.letter == grade).weight;

                // calculate grade points by multiplying credits by grade weight
                gradePoints += credits * gradeWeight;

                // track the number of courses that have both credits and grade information
                creditsTaken += credits;
            }
        });

    // if at least one course is fully filled out
    if (creditsTaken > 0 && gradePoints > 0) 
    {
        // calculate GPA to three decimal points
        return (gradePoints / creditsTaken).toFixed(3);
    }
    // otherwise show no GPA (0.0)
    else 
    {
        return "0.0";
    }
}

/**
 * Group an array of items into lines by Y-positions with some tolerance for improper line
 * alignments.
 * @param {Object[]} items
 * @param {Number} tolerance
 * @return {Object} groupedLines
 */
function fuzzyGroupByYPos(items, tolerance=0.3) {
    return items.reduce((linesArray, item) => {
        // get the closest previously recorded y-pos bucket
        // from: https://stackoverflow.com/questions/8584902/get-the-closest-number-out-of-an-array
        const closest = Object.keys(linesArray)
            .reduce((prev, curr) => (Math.abs(curr - item.y) < Math.abs(prev - item.y) ? curr : prev), 0);

        // calculate the difference between the closest line by Y-pos and the current line
        const difference = Math.abs(closest - item.y);

        // if the difference is close enough, it is the same line, just improperly aligned
        if (difference < tolerance && difference !== 0) {
            linesArray[closest].push(item);
        }
        // otherwise it is a different line
        else {
            // from: https://stackoverflow.com/questions/14446511/most-efficient-method-to-groupby-on-an-array-of-objects
            (linesArray[item.y] = linesArray[item.y] || []).push(item);
        }

        return linesArray;
    }, {});
}

/**
 * Create an HTML element and add it to the DOM tree.
 * @param {HTMLElement} parent 
 * @param {String} tag 
 * @param {Object} attributes 
 */
function createElement(parent, tag, attributes={}) {
    // create the element to whatever tag was given
    const el = document.createElement(tag);

    // go through all the attributes in the object that was given
    Object.entries(attributes)
        .forEach(([attr, value]) => {
            // handle the various special cases that will cause the Element to be malformed
            if (attr == "innerText") {
                el.innerText = value;
            }
            else if (attr == "innerHTML") {
                el.innerHTML = value;
            }
            else if (attr == "textContent") {
                el.textContent = value;
            }
            else if (attr == "onclick") {
                el.onclick = value;
            }
            else if (attr == "onchange") {
                el.onchange = value;
            }
            else if (attr == "oninput") {
                el.oninput = value;
            }
            else if (attr == "onkeydown") {
                el.onkeydown = value;
            }
            else if (attr == "onkeyup") {
                el.onkeyup = value;
            }
            else if (attr == "text") {
                el.text = value;
            }
            else if (attr == "value") {
                el.value = value;
            }
            else {
                el.setAttribute(attr, value);
            }
        });

    // add the newly created element to its parent
    parent.appendChild(el);

    // return the element in case this element is a parent for later element creation
    return el;
}