const puppeteer = require('puppeteer');
const fs = require('fs');

const dir = './icons';

const baseUrl = 'https://react-icons.github.io';
const homeSlug = '/react-icons';
const iconPageSlugs = [];

const getUrl = (slug) => baseUrl + slug;
const findSlug = (str) => {
    const slug = str.replace(/^\/react-icons\/icons\?name=([\S]+)$/g, '$1');
    if (!slug) {
        throw new Error('Invalid slug: ' + slug);
    }
    return slug;
};

const queryPageElements = async (pageSlug, selector, callback, waitFor = null) => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(getUrl(pageSlug));
        await page.waitForSelector(waitFor ?? selector, { timeout: 1000 });

        const elements = await page.$$(selector);

        for (const el of Array.from(elements)) {
            await callback(el, page);
        }

        await browser.close();
    } catch (error) {
        console.log(error);
    }
};

const createFileStructure = (slugs) => {
    console.log(slugs);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    for (const slug of slugs) {
        if (!fs.existsSync(dir + '/' + slug)) {
            fs.mkdirSync(dir + '/' + slug);
        }
    }
};

const main = async () => {
    console.time('query icons');
    await queryPageElements(homeSlug, '#__next ul li a', async (el) => {
        const hrefHandle = await el.getProperty('href');
        const slug = (await hrefHandle.jsonValue()).replace(baseUrl, '');
        if (slug === homeSlug) return;

        if (!/^\/react-icons\/icons\?name=[\S]+$/.test(slug)) {
            throw new Error('Invalid slug: ' + slug);
        }

        iconPageSlugs.push(slug);
    });

    createFileStructure(iconPageSlugs.map((slug) => findSlug(slug)));

    let i = 0;
    for (const slugUrl of iconPageSlugs) {
        console.log(++i + ' / ' + iconPageSlugs.length);
        const slug = findSlug(slugUrl);

        await queryPageElements(
            slugUrl,
            'div.icons > .item',
            async (el) => {
                let iconEl = await el.$('svg');
                let i = 0;
                while (!(iconEl = await el.$('svg')) && i < 10) {
                    console.log('svg does not exist for slug ' + slug);
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    i++;
                }
                const icon = await iconEl.evaluate((element) => element.outerHTML);
                const nameEl = await el.$('.name');
                const name = await nameEl.evaluate((element) => element.innerText);

                fs.appendFile(`icons/${slug}/${name}.svg`, icon, function (err) {
                    if (err) throw err;
                });
            },
            'div.icons > .item svg'
        );
    }

    console.timeEnd('query icons');
};

main();
