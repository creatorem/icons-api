// @ts-ignore
const fs = require('fs');
// @ts-ignore
const _ = require('lodash');
// @ts-ignore
const { getVariants } = require('./utils');

const getDirectories = (source: string): string[] => {
    return fs
        .readdirSync(source, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
};

const getFiles = (source: string): string[] => {
    return fs.readdirSync(source);
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
        const folderName = _.upperFirst(_.camelCase(rawName));
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
