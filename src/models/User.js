const { mongoose } = require('mongoose');

const userSchema = mongoose.Schema({
    tgId: {
        type: String,  
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    isBot: {
        type: Boolean,
        default: true
    },
    username: {
        type: String,
        require: true,
        unique: true
    },
    promptToken: {
        type: Number,
        required:false
    },
    completionTokens: {
        type: Number,
        required:false
    },
}, 
{ timestamps: true }
);

module.exports = mongoose.model('Users', userSchema);
