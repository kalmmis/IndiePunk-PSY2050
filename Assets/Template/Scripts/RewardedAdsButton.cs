using UnityEngine;
using UnityEngine.UI;
using UnityEngine.Advertisements;

[RequireComponent(typeof(Button))]
public class RewardedAdsButton : MonoBehaviour, IUnityAdsListener
{

#if UNITY_IOS
    private string gameId = "3346606";
#elif UNITY_ANDROID
    private string gameId = "3346606";
#endif
    private string gameId = "3346606";
    LevelController lc;
    public static Player instance;
    
    Button myButton;
    public string myPlacementId = "rewardedVideo";

    void Start()
    {
        Debug.Log("Started Rewarded");
        myButton = GetComponent<Button>();

        // Set interactivity to be dependent on the Placement’s status:
        myButton.interactable = Advertisement.IsReady(myPlacementId);

        // Map the ShowRewardedVideo function to the button’s click listener:
        if (myButton) myButton.onClick.AddListener(ShowRewardedVideo);

        // Initialize the Ads listener and service:
        Advertisement.AddListener(this);
        Advertisement.Initialize(gameId, true);
    }

    // Implement a function for showing a rewarded video ad:
    void ShowRewardedVideo()
    {
        Debug.Log("ShowRewardedVideo Rewarded");
        Advertisement.Show(myPlacementId);
    }

    // Implement IUnityAdsListener interface methods:
    public void OnUnityAdsReady(string placementId)
    {
        // If the ready Placement is rewarded, activate the button: 
        if (placementId == myPlacementId)
        {
            myButton.interactable = true;
        }
    }

    public void OnUnityAdsDidFinish(string placementId, ShowResult showResult)
    {
        // Define conditional logic for each ad completion status:
        if (showResult == ShowResult.Finished)
        {
            Debug.Log("OnUnityAdsDidFinish : showResult Skept");
            // Reward the user for watching the ad to completion.
            lc = FindObjectOfType<LevelController>();
            lc.StartPlayer();
            lc.HideAdsUI();
            Time.timeScale = 1f;
        }
        else if (showResult == ShowResult.Skipped)
        {
            Debug.Log("Ads Skept");
            // Do not reward the user for skipping the ad.
        }
        else if (showResult == ShowResult.Failed)
        {
            Debug.LogWarning("The ad did not finish due to an error.");
        }
    }

    public void OnUnityAdsDidError(string message)
    {
        // Log the error.
    }

    public void OnUnityAdsDidStart(string placementId)
    {
        // Optional actions to take when the end-users triggers an ad.
        Debug.Log("Ad Triggered");
    }
    private void OnDestroy()
    {
        Debug.Log("Advertise REmoved!");
        Advertisement.RemoveListener(this);
    }
}