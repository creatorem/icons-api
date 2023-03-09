const app = require('express')();
const PORT = 8080;
const fs = require('fs');

const getDirectories = (source) => {
    return fs
        .readdirSync(source, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
};

const getFiles = (source) => {
    return fs.readdirSync(source);
};

const getFileContent = (source) => {
    return fs.readFileSync(source, { encoding: 'utf8', flag: 'r' });
};

const iconFolders = getDirectories('./icons');

app.get('/api/v1/:lib', (req, res) => {
    const { lib } = req.params;

    if (!iconFolders.includes(lib)) {
        res.status(404).send({
            error: 'Library not found',
        });
        return;
    }
    const iconNames = getFiles(`./icons/${lib}`);
    console.log(iconNames);
    console.log('sluat');

    const icons = iconNames.map((iconName) => {
        const icon = getFileContent(`./icons/${lib}/${iconName}`);
        return {
            name: iconName.replace('.svg', ''),
            url: icon,
        };
    });

    res.status(200).send(icons);
});

app.listen(PORT, () => console.log(`Server is running on port http://localhost:${PORT}`));
