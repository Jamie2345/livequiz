const express = require('express')
const router = express.Router()

const QuizBuilderController = require('../controllers/QuizBuilderController')

router.post('/make', QuizBuilderController.make)
router.post('/add', QuizBuilderController.add)
router.put('/edit', QuizBuilderController.edit)

module.exports = router