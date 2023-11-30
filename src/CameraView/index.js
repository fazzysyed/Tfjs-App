import { useState } from "react";
import { View, Platform } from "react-native";
import { Camera, CameraType } from "expo-camera";
import { GLView } from "expo-gl";
import Expo2DContext from "expo-2d-context";
import * as tf from "@tensorflow/tfjs";
import { cameraWithTensors } from "@tensorflow/tfjs-react-native";
import { preprocess } from "../utils/preprocess";
import { renderBoxes } from "../utils/renderBox";

const TensorCamera = cameraWithTensors(Camera);

const CameraView = ({ type, model, inputTensorSize, config, children }) => {
  const [ctx, setCTX] = useState(null);
  const typesMapper = { back: CameraType.back, front: CameraType.front };
  const [process, setProcess] = useState(false);

  let requestAnimationFrameId = 0;
  let frameCount = 0;
  let makePredictionsEveryNFrames = 1;

  const cameraStream = (imageAsTensors) => {
    try {
    } catch (e) {
      // console.log("Tensor 1 not found!");
    }
    const loop = async () => {
      // && detected == true
      if (model !== null) {
        if (frameCount % makePredictionsEveryNFrames === 0) {
          setProcess(true);
          const imageTensor = imageAsTensors.next().value;
          await getPrediction(imageTensor);

          setProcess(false);

          // .catch(e => console.log(e));
        }
      }

      frameCount += 1;
      frameCount = frameCount % makePredictionsEveryNFrames;
      requestAnimationFrameId = requestAnimationFrame(loop);
    };
    loop();

    //loop infinitely to constantly make predictions
  };
  //
  const getPrediction = async (tensor) => {
    // if (!videoLink) {

    //
    // const imageData2 = tensor.resizeBilinear([640, 640]);
    // // tf.image.resizeBilinear(tensor, [224, 224]);
    // const normalized = imageData2.cast("float32").div(127.5).sub(1);
    // const final = tf.expandDims(normalized, 0);

    const [input, xRatio, yRatio] = preprocess(
      tensor,
      inputTensorSize[2],
      inputTensorSize[1]
    );

    const prediction = await model.executeAsync(input);

    const [boxes, scores, classes] = prediction.slice(0, 3);
    const boxes_data = boxes.dataSync();
    const scores_data = scores.dataSync();
    const classes_data = classes.dataSync();

    renderBoxes(ctx, config.threshold, boxes_data, scores_data, classes_data, [
      xRatio,
      yRatio,
    ]);

    tf.dispose([input, prediction]);
  };

  let textureDims;
  if (Platform.OS === "ios") {
    textureDims = {
      height: 1920,
      width: 1080,
    };
  } else {
    textureDims = {
      height: 1200,
      width: 1600,
    };
  }
  return (
    <>
      {ctx && (
        <TensorCamera
          // Standard Camera props
          className="w-full h-full z-0"
          type={typesMapper[type]}
          cameraTextureHeight={textureDims.height}
          cameraTextureWidth={textureDims.width}
          // Tensor related props
          //use_custom_shaders_to_resize={true}
          resizeHeight={640}
          resizeWidth={640}
          resizeDepth={inputTensorSize[3]}
          onReady={cameraStream}
          autorender={true}
        />
      )}
      <View className="absolute left-0 top-0 w-full h-full flex items-center bg-transparent z-10">
        <GLView
          className="w-full h-full "
          onContextCreate={async (gl) => {
            const ctx2d = new Expo2DContext(gl);
            await ctx2d.initializeText();
            setCTX(ctx2d);
          }}
        />
      </View>
      {children}
    </>
  );
};

export default CameraView;
