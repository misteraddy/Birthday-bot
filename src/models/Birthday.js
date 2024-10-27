const mongoose = require("mongoose");

const birthdaySchema = mongoose.Schema({
    name: {            
        type: String,
        required: true
    },
    birthday: {        
        type: Date,
        required: true
    },
    tgId: {
        type: String,
        required: true
    },
    isNotified: {
        type: Boolean,
        default:false
    }
}, { timestamps: true });

module.exports = mongoose.model("Birthdays", birthdaySchema);
