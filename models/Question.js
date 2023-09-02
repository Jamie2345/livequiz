const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const questionSchema = new Schema({
    question: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    },
    multipleChoice: {
        type: Array,
        required: false
    }

}, {timestamps: true});

const Question = mongoose.model('Question', questionSchema)
module.exports = Question;