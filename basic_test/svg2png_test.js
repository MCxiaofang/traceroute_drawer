const sharp = require("sharp")

sharp("test.svg")
  .png()
  .toFile("new-file.jpg")
  .then(function(info) {
    console.log(info)
  })
  .catch(function(err) {
    console.log(err)
  })