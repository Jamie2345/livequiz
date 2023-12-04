class liveQuiz {
  constructor(quizJson, points_per_question=100) {
    this.quizJson = quizJson;
    this.size = this.quizJson.questions.length;
    this.currentQuestion = null;
    this.questionIndex = null;
    this.running = true;
    this.ppq = points_per_question;
  }

  nextQuestion() {
    if (this.questionIndex === null) {
      this.questionIndex = 0
    }
    else {
      this.questionIndex++;
    }

    if (this.questionIndex < this.size) {
      var newQuestion = this.quizJson.questions[this.questionIndex]
      this.currentQuestion = newQuestion
      return newQuestion
    }
    else {
      this.running = false;
      this.questionIndex = null;
      this.currentQuestion = null;
    }
    
  }

  checkAnswer(answerInput) {
    return answerInput === this.currentQuestion.answer;
  }

  isGameRunning() {
    return this.running;
  }

  questionsLeft() {
    return this.size - (this.questionIndex + 1);  // add 1 to turn the index into a number
  }

}


module.exports = liveQuiz;