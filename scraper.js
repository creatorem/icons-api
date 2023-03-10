const puppeteer = require('puppeteer');
const fs = require('fs');

const dir = './icons';

const MATERIAL_DESIGN_ICONS_URL = 'https://mui.com/material-ui/material-icons/?theme=';
const REACT_ICONS_BASE_URL = 'https://react-icons.github.io';
const HOME_SLUG = '/react-icons';
const iconPageSlugs = [];

const getVariants = (slug) => {
    if (slug === 'md') {
        return ['filled', 'outlined', 'rounded', 'sharp', 'two-tone'];
    } else if (slug === 'reg') {
        return ['reg'];
    } else if (slug === 'filled') {
        return ['filled'];
    } else if (slug === 'tfi') {
        return ['alt'];
    }

    const defaultVariants = ['fill', 'outline'];

    if (slug === 'io5') {
        defaultVariants.push('sharp');
    } else if (slug === 'ri') {
        defaultVariants.push('line');
    } else if (slug === 'ai') {
        defaultVariants.push('twotone');
    }

    return defaultVariants;
};

/**
 * Get the url of a react-icons page
 *
 * @param string slug
 * @returns
 */
const getUrl = (slug) => REACT_ICONS_BASE_URL + slug;

/**
 * Get the url of a mui page
 *
 * @param string slug
 * @returns
 */
const getMdUrl = (variant) => MATERIAL_DESIGN_ICONS_URL + variant;
const findSlug = (str) => {
    const slug = str.replace(/^\/react-icons\/icons\?name=([\S]+)$/g, '$1');
    if (!slug) {
        throw new Error('Invalid slug: ' + slug);
    }
    return slug;
};

const queryPageElements = async (url, selector, callback, waitFor = null) => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url);
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

const writeIconFile = (slug, name, icon) => {
    fs.appendFile(`icons/${slug}/${name}.svg`, icon, function (err) {
        if (err) throw err;
    });
};

const scrapReactIcons = async (slugUrl) => {
    const slug = findSlug(slugUrl);

    await queryPageElements(
        getUrl(slugUrl),
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
            writeIconFile(slug, name, icon);
        },
        'div.icons > .item svg'
    );
};

const scrapMaterialDesignIcons = async () => {
    const variants = [];

    await queryPageElements(
        MATERIAL_DESIGN_ICONS_URL,
        '#main-content > div:nth-child(6) > div:nth-child(2) > div > div:nth-child(1) input[type="radio"]',
        async (el) => {
            const variant = await el.evaluate((element) => element.value);
            variants.push(variant.replace(/\s+/g, '+'));
        }
    );

    console.log(variants);

    for (const variant of variants) {
        await queryPageElements(
            getMdUrl(variant),
            '#main-content > div:nth-child(6) > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(3) > span',
            async (el) => {
                const iconEl = await el.$('svg');
                const icon = await iconEl.evaluate((element) => element.outerHTML);
                const nameEl = await el.$('div div');
                const name = await nameEl.evaluate((element) => element.innerText);
                writeIconFile('md', 'Md' + name, icon);
            },
            '#main-content > div:nth-child(6) > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(3) > span svg'
        );
    }
};

const main = async () => {
    console.time('query icons');
    await queryPageElements(getUrl(HOME_SLUG), '#__next ul li a', async (el) => {
        const hrefHandle = await el.getProperty('href');
        const slug = (await hrefHandle.jsonValue()).replace(REACT_ICONS_BASE_URL, '');
        if (slug === HOME_SLUG) return;

        if (!/^\/react-icons\/icons\?name=[\S]+$/.test(slug)) {
            throw new Error('Invalid slug: ' + slug);
        }

        iconPageSlugs.push(slug);
    });

    createFileStructure(iconPageSlugs.map((slug) => findSlug(slug)));

    let i = 0;
    for (const slugUrl of iconPageSlugs) {
        console.log(++i + ' / ' + iconPageSlugs.length);
        if (slug === 'md') {
            await scrapMaterialDesignIcons();
            continue;
        }
        await scrapReactIcons(slugUrl);
    }

    console.timeEnd('query icons');
};

main();
