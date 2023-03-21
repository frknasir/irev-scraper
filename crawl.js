import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import axios from "axios";

export const crawl = async (websiteUrl, parentFolder) => {
    console.info("Instantiating browsers...");
    const browser = await puppeteer.launch({ headless: false });
    console.info("Creating a new page...");
    const page = await browser.newPage();

    console.info(`Visiting: ${websiteUrl}`);
    await page.goto(websiteUrl, { waitUntil: 'networkidle0', timeout: 120000 });

    // Get all links on the page
    console.info(`Retrieving all links on the page: ${websiteUrl}`);
    const links = await page.$$eval("a", (links) => 
        links.map((link) => ({title: link.textContent, href: link.href}))
            .filter(({ href }) => {
                return ![
                    "",
                    "https://inecnigeria.org/",
                    "https://www.inecnigeria.org/",
                    "http://www.inecnigeria.org/",
                    "https://inecelectionresults.ng/elections",
                    "https://inecelectionresults.ng/elections/latest",
                    "https://www.inecelectionresults.ng/elections",
                    "https://www.inecelectionresults.ng/elections/latest",
                ].includes(href)
            })
    );
    console.log(links);

    // Follow each link and crawl its page
    for (const [index, {title, href: link}] of links.entries()) {
        if (link.match(/\.(png|jpg|jpeg|pdf|doc|docx|xls|xlsx)$/i)) {
            // If link is a file, download it
            // Get the text content of the fifth div element within the body
            console.info(`Retrieving the polling unit code`);
            const divText = await page.evaluate((i) => {
                const body = document.querySelector('body');
                const divs = body.querySelectorAll('div.d-flex.justify-content-between.m-2.p-2.bg-light.rounded.p-3');
                const fifthDiv = divs[i]; // index starts from 0
                return fifthDiv.textContent;
            }, index);

            const puCode = getPollingUnitCode(divText);

            if (!puCode) {
                break;
            }

            const folderName = puCode.replace(/\//g, "-");
            const folderPath = path.join(parentFolder, folderName);

            console.info(`Creating directory for the PU code: ${puCode}`);
            fs.mkdirSync(folderPath, { recursive: true });

            console.info(`Downloading the file: ${link}`);
            await downloadFile(link, folderPath).then(() => console.log(`Successfully downloaded the file: ${link} to the folder ${folderPath}`));
        } else if (link.startsWith("https://www.inecelectionresults.ng/elections")) {
            // If link is a webpage, scrape it recursively
            const folderName = title.replace(/\//g, "-").replace(" ", "-");
            const folderPath = path.join(parentFolder, folderName);

            console.info(`Creating folder path: ${folderPath}`);
            fs.mkdirSync(folderPath, { recursive: true });
            await crawl(link, folderPath);
        }
    }

    await browser.close();
}

// Gets polling unit code from a string
function getPollingUnitCode(text) {
    const regex = /\b\d{2}\/\d{2}\/\d{2}\/\d{3}\b/;
    const matches = text.match(regex);

    if (matches && matches.length > 0) {
        return matches[0];
    }

    return false;
}

// Function to download a file
async function downloadFile(url, folder) {
    const response = await axios.get(url, { responseType: "stream" });
    const fileName = url.split("/").pop();
    const filePath = path.join(folder, fileName);
    response.data.pipe(fs.createWriteStream(filePath));
}
