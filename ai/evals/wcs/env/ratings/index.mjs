import { angularEslintRating } from "./angular-eslint.rating.mjs";
import { changeDetectionRating } from "./change-detection.rating.mjs";
import { formattingRating } from "./formatting.rating.mjs";
import { formsRating } from "./forms.rating.mjs";
import { inputOutputRating } from "./input-output.rating.mjs";
import { modelDeclarationKindRating } from "./model-declaration-kind.rating.mjs";
import { modelPurityRating } from "./model-purity.rating.mjs";
import { noMutateOnSignalsRating } from "./no-mutate-on-signals.rating.mjs";
import { noRouteSnapshotRating } from "./no-route-snapshot.rating.mjs";
import { pureStateTransformationsRating } from "./pure-state-transformations.rating.mjs";
import { reactiveRating } from "./reactive.rating.mjs";
import { serviceDecoratorRating } from "./service-decorator.rating.mjs";
import { standaloneRating } from "./standalone.rating.mjs";
import { axeRating, successfulBuildRating } from "web-codegen-scorer";

export const customRatings = [
  angularEslintRating,
  inputOutputRating,
  noMutateOnSignalsRating,
  pureStateTransformationsRating,
  reactiveRating,
  noRouteSnapshotRating,
  formattingRating,
  changeDetectionRating,
  standaloneRating,
  modelDeclarationKindRating,
  modelPurityRating,
  formsRating,
  serviceDecoratorRating,
];

export const fullRatings = [...customRatings, axeRating, successfulBuildRating];
