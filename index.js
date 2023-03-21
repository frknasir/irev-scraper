import { crawl } from "./crawl.js";

(async () => {
    // Scrape IREV
    crawl(
        "https://www.inecelectionresults.ng/elections/types",
        "./downloads/", // this folder must exist before running the script
    );
})();
