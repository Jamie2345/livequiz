const Question = require('../models/Question');
const Quiz = require('../models/Quiz');

console.log(Quiz);


const make = (req, res) => {
  Quiz.findOne({name: req.body.name})
  .then(quiz => {
    if (quiz) {
      res.status(409)
      res.json({
        message: "Quiz name already in use"
      })
    }
    else {
      let newQuiz = new Quiz({
        name: req.body.name,
        creator: req.body.creator,
        creator_id: req.body.creator_id,
        topics: req.body.topics,
        questions: req.body.questions
      })

      newQuiz.save()
      .then(newQuiz => {
        res.json(newQuiz)
      })
      .catch(error => {
        res.json({
          message: 'An error occurred please try again later'
        })
      })
    }
  })
};

const add = (req, res) => {
  const body = req.body;
  res.json(body);
};

const edit = (req, res) => {
  const body = req.body;
  res.json(body);
};


module.exports = {
  make,
  add,
  edit
}