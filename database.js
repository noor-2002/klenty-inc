const mongoose = require('mongoose');
// const dbUrl = process.env.DB;

const dbUrl="mongodb+srv://klenty:hdHfzzl59Fco6Tmu@klenty.eeiwcd8.mongodb.net/?retryWrites=true&w=majority"
// console.log(process.env)

// mongoose.connect('mongodb://localhost:27017/passport');

mongoose.connect(dbUrl, {
// mongoose.connect("https://klenty-noormd.harperdbcloud.com", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log(`${console.log(process.env)}+ DB connection successful ✅`));

const userSchema = mongoose.Schema({
    username: String,
    email: String,
    password: String,
})

const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel;
