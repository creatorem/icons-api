const fs = require('fs');
const _ = require('lodash');
const { getVariants } = require('./utils');

const getDirectories = (source) => {
    return fs
        .readdirSync(source, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
};

const getFiles = (source) => {
    return fs.readdirSync(source);
};

const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

const iconFolders = getDirectories('./icons');

for (const slug of iconFolders) {
    const iconNames = getFiles(`./icons/${slug}`);
    const variants = getVariants(slug).map((variant) => _.snakeCase(variant));

    const sortedIconTable = {};

    for (const iconName of iconNames) {
        const rawName = ('_' + _.snakeCase(iconName.replace('.svg', '')) + '_')
            .replace(new RegExp(`_(?:${variants.join('|')})_`, 'g'), '_')
            .replace(/^_+|_+$/g, '');
        if (sortedIconTable[rawName] === undefined) {
            sortedIconTable[rawName] = [];
        }
        sortedIconTable[rawName].push(iconName);
    }

    for (rawName in sortedIconTable) {
        if (sortedIconTable[rawName].length <= 1) continue;
        const folderName = capitalize(_.camelCase(rawName));
        const newDirPath = `./icons/${slug}/${folderName}`;

        if (!fs.existsSync(newDirPath)) {
            fs.mkdirSync(newDirPath);
        }

        for (const svgFileName of sortedIconTable[rawName]) {
            fs.rename(
                `./icons/${slug}/${svgFileName}`,
                `./icons/${slug}/${folderName}/${svgFileName}`,
                (err) => {
                    if (err) throw err;
                }
            );
        }
    }
}
