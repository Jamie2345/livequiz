class liveQuiz {
  constructor(quizJson) {
    this.quizJson = quizJson;
    this.currentQuestion = null;
    this.questionNumber = null;
    this.running = true;
  }

  nextQuestion() {
    if (this.questionNumber === null) {
      this.questionNumber = 0
    }
    else {
      this.questionNumber++;
    }

    if (this.questionNumber < this.quizJson.questions.length) {
      var newQuestion = this.quizJson.questions[this.questionNumber]
      this.currentQuestion = newQuestion
      return newQuestion
    }
    else {
      this.running = false;
      this.questionNumber = null;
      this.currentQuestion = null;
    }
    
  }

  checkAnswer(answerInput) {
    return answerInput === this.currentQuestion.answer;
  }

  isGameOver() {
    return this.questionNumber > this.quizJson.questions.length;
  }

}


module.exports = liveQuiz;