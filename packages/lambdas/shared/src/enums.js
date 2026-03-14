"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalStatus = exports.GoalTimeframe = exports.GoalType = exports.FollowStatus = exports.FeedEventType = exports.WeightUnit = exports.ExerciseModality = exports.WorkoutSource = exports.WorkoutStatus = exports.PermissionType = void 0;
var PermissionType;
(function (PermissionType) {
    PermissionType["PUBLIC"] = "PUBLIC";
    PermissionType["FOLLOWERS_ONLY"] = "FOLLOWERS_ONLY";
    PermissionType["PRIVATE"] = "PRIVATE";
})(PermissionType || (exports.PermissionType = PermissionType = {}));
var WorkoutStatus;
(function (WorkoutStatus) {
    WorkoutStatus["IN_PROGRESS"] = "in_progress";
    WorkoutStatus["COMPLETED"] = "completed";
    WorkoutStatus["CANCELLED"] = "cancelled";
})(WorkoutStatus || (exports.WorkoutStatus = WorkoutStatus = {}));
var WorkoutSource;
(function (WorkoutSource) {
    WorkoutSource["AI_GENERATED"] = "ai_generated";
    WorkoutSource["MANUAL"] = "manual";
})(WorkoutSource || (exports.WorkoutSource = WorkoutSource = {}));
var ExerciseModality;
(function (ExerciseModality) {
    ExerciseModality["SETS_REPS"] = "sets_reps";
    ExerciseModality["DURATION"] = "duration";
    ExerciseModality["BURNOUT"] = "burnout";
})(ExerciseModality || (exports.ExerciseModality = ExerciseModality = {}));
var WeightUnit;
(function (WeightUnit) {
    WeightUnit["LBS"] = "LBS";
    WeightUnit["KG"] = "KG";
})(WeightUnit || (exports.WeightUnit = WeightUnit = {}));
var FeedEventType;
(function (FeedEventType) {
    FeedEventType["WORKOUT_COMPLETE"] = "workout_complete";
    FeedEventType["PR_HIT"] = "pr_hit";
})(FeedEventType || (exports.FeedEventType = FeedEventType = {}));
var FollowStatus;
(function (FollowStatus) {
    FollowStatus["PENDING"] = "pending";
    FollowStatus["ACCEPTED"] = "accepted";
})(FollowStatus || (exports.FollowStatus = FollowStatus = {}));
var GoalType;
(function (GoalType) {
    GoalType["TOTAL_WORKOUTS"] = "total_workouts";
    GoalType["WORKOUTS_PER_WEEK"] = "workouts_per_week";
    GoalType["TOTAL_VOLUME"] = "total_volume";
    GoalType["ONE_REP_MAX"] = "one_rep_max";
    GoalType["WORKOUT_STREAK"] = "workout_streak";
    GoalType["EXERCISE_SESSIONS"] = "exercise_sessions";
})(GoalType || (exports.GoalType = GoalType = {}));
var GoalTimeframe;
(function (GoalTimeframe) {
    GoalTimeframe["WEEKLY"] = "weekly";
    GoalTimeframe["MONTHLY"] = "monthly";
    GoalTimeframe["QUARTERLY"] = "quarterly";
    GoalTimeframe["YEARLY"] = "yearly";
    GoalTimeframe["ALL_TIME"] = "all_time";
})(GoalTimeframe || (exports.GoalTimeframe = GoalTimeframe = {}));
var GoalStatus;
(function (GoalStatus) {
    GoalStatus["ACTIVE"] = "active";
    GoalStatus["COMPLETED"] = "completed";
    GoalStatus["FAILED"] = "failed";
})(GoalStatus || (exports.GoalStatus = GoalStatus = {}));
