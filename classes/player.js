class Player {
    constructor(uuid, name, score=0, ready=false) {
        this.uuid = uuid;
        this.name = name;
        this.score = score;
        this.ready = ready;
    };

    toggleReady() {
      this.ready = !this.ready;
    }

    generateName() {
        const adjectives = [
            "Silly", "Clever", "Gentle", "Fierce", "Joyful",
            "Elegant", "Mysterious", "Adventurous", "Charming", "Curious",
            "Daring", "Playful", "Graceful", "Witty", "Radiant",
            "Dynamic", "Spirited", "Vibrant", "Whimsical", "Enchanting",
            "Brilliant", "Captivating", "Colorful", "Exquisite", "Fantastic",
            "Graceful", "Magical", "Mesmerizing", "Quirky", "Serene",
            "Thunderous", "Wondrous", "Fantastic", "Zany", "Crazy",
            "Bizarre", "Unforgettable", "Epic", "Jovial", "Unicorn",
            "Ninja", "Stealthy", "Mystical", "Gummy", "Swift",
            // ... Add more adjectives
          ];
          
          const animals = [
            "Lion", "Elephant", "Kangaroo", "Penguin", "Giraffe",
            "Dolphin", "Tiger", "Ostrich", "Koala", "Panda",
            "Zebra", "Hippopotamus", "Cheetah", "Peacock", "Octopus",
            "Raccoon", "Jaguar", "Hummingbird", "Flamingo", "Kookaburra",
            "Porcupine", "Chameleon", "Lemur", "Meerkat", "Narwhal",
            "Pangolin", "Sloth", "Toucan", "Wallaby", "Yak",
            // ... Add more animal names
          ];
          
          
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const animal = animals[Math.floor(Math.random() * animals.length)];
        return adjective + " " + animal;
               
    }
}

module.exports = Player;