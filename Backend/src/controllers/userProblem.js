const { getLanguageById, submitBatch, submitToken } = require("../utils/problemUtility")
const Problem = require("../models/problem")
const User = require("../models/user")
const Submission = require("../models/submission")
const mongoose = require("mongoose");


const createProblem = async (req, res) => {
    try {
        const {
            title,
            description,
            difficulty,
            tags,
            explainTestCase,
            visibleTestCases,
            hiddenTestCases,
            startCode,
            referenceSolution
        } = req.body;

        console.log(explainTestCase)

        // =========================
        // 1️⃣ Basic Validation
        // =========================
        console.log("checking info");
        if (!title || !description || !difficulty || !tags) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        // console.log("1");
        if (!Array.isArray(visibleTestCases) || visibleTestCases.length === 0) {
            return res.status(400).json({ message: "Visible test cases required" });
        }
        // console.log("2");

        if (!Array.isArray(hiddenTestCases) || hiddenTestCases.length === 0) {
            return res.status(400).json({ message: "Hidden test cases required" });
        }
        // console.log("3");

        if (!Array.isArray(referenceSolution) || referenceSolution.length === 0) {
            return res.status(400).json({ message: "Reference solution required" });
        }

        if (!Array.isArray(explainTestCase) || explainTestCase.lenght === 0) {
            return res.status(400).json({ message: "Explain Test Case Required" })
        }

        // =========================
        // 2️⃣ Run Judge Validation
        // =========================
        // console.log("info come perfect");
        for (const solution of referenceSolution) {
            // console.log(solution);
            const { language, completeSolution } = solution;

            if (!language || !completeSolution) {
                return res.status(400).json({
                    message: "Invalid reference solution format"
                });
            }

            const languageId = getLanguageById(language);

            if (!languageId) {
                return res.status(400).json({
                    message: `Unsupported language: ${language}`
                });
            }

            const submissions = visibleTestCases.map((testcase) => ({
                source_code: completeSolution,
                language_id: languageId,
                stdin: testcase.input,
                expected_output: testcase.output
            }));
            // console.log(submissions);
            // Call Judge0 batch
            const submitResult = await submitBatch(submissions);

            // 🚨 CRITICAL SAFETY CHECK
            if (!submitResult || !Array.isArray(submitResult)) {
                return res.status(502).json({
                    message: "Judge API failed or rate limited",
                    error: submitResult
                });
            }
            // console.log(submitResult);
            const resultToken = submitResult.map((value) => value.token);

            const testResult = await submitToken(resultToken);

            if (!testResult || !Array.isArray(testResult)) {
                return res.status(502).json({
                    message: "Failed to fetch Judge results"
                });
            }
            // console.log(testResult);
            for (const test of testResult) {
                if (test.status_id !== 3) {
                    return res.status(400).json({
                        message: "Reference solution failed test cases",
                        failedTest: test
                    });
                }
            }
        }
        console.log("judge0 proceed finish");
        // =========================
        // 3️⃣ Save to Database
        // =========================

        const newProblem = await Problem.create({
            title,
            description,
            difficulty,
            tags,
            explainTestCase,
            visibleTestCases,
            hiddenTestCases,
            startCode,
            referenceSolution,
            problemCreator: req.result._id
        });

        return res.status(201).json({
            message: "Problem created successfully",
            problemId: newProblem._id
        });

    } catch (error) {
        console.error("🔥 CREATE PROBLEM ERROR:", error);

        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const upload = async (req, res) => {
    const { id } = req.params;

    try {
        const { ytlink } = req.body;

        const updatedProblem = await Problem.findByIdAndUpdate(
            id,
            { ytlink: ytlink },
            { new: true }   // updated document return karega
        );

        if (!updatedProblem) {
            return res.status(404).send("Problem not found");
        }

        return res.send("Ytlink Updated");

    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal Server Error: " + err.message);
    }
};

const getProblemById = async (req, res) => {
    const { id } = req.params;
    try {

        if (!id)
            res.send("ID is Missing");

        // console.log(id);

        const getProblem = await Problem.findById(id).select('title description difficulty tags visibleTestCases startCode referenceSolution ytlink explainTestCase');
        // for not selection then do this .select('~hiddenTestCases');
        // console.log(getProblem)

        if (!getProblem)
            res.status(404).send("Problem is Missing");

        res.status(200).send(getProblem);
    }
    catch (error) {
        res.status(404).send("Error " + error);
    }
};

const getAllProblem = async (req, res) => {
    try {

        const getProblem = await Problem.find({}).select('_id title difficulty tags');

        if (getProblem.length == 0) {
            return res.status(200).send([]);
        }

        res.status(200).send(getProblem);
    }
    catch (error) {
        res.status(404).send("Error " + error);
    }
};

const solvedAllProblemByUser = async (req, res) => {
    try {

        const userId = new mongoose.Types.ObjectId(req.result._id);

        const solvedProblems = await Submission.aggregate([
            {
                $match: {
                    userId: userId,
                    status: "accepted"   // ✅ correct field
                }
            },
            {
                $sort: { createdAt: 1 }
            },
            {
                $group: {
                    _id: "$problemId",
                    solvedAt: { $first: "$createdAt" }
                }
            },
            {
                $lookup: {
                    from: "problems",   // collection name
                    localField: "_id",
                    foreignField: "_id",
                    as: "problem"
                }
            },
            {
                $unwind: "$problem"
            },
            {
                $project: {
                    _id: "$problem._id",
                    title: "$problem.title",
                    difficulty: "$problem.difficulty",
                    tags: "$problem.tags",
                    solvedAt: 1
                }
            },
            {
                $sort: { solvedAt: -1 }
            }
        ]);

        res.status(200).json(solvedProblems);

    } catch (err) {
        res.status(500).send("Server Error " + err.message);
    }
};

const submittedProblem = async (req, res) => {

    try {

        const userId = req.result._id;
        const problemId = req.params.pid;

        const ans = await Submission.find({ userId, problemId });

        return res.status(200).json(ans);
        // console.log(ans);

        // if (ans.length == 0)
        //     res.status(200).send("No Submission is persent");

        // res.status(200).send(ans);

    }
    catch (err) {
        res.status(500).send("Internal Server Error");
    }
};

module.exports = { createProblem, upload, getProblemById, getAllProblem, solvedAllProblemByUser, submittedProblem };
