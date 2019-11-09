﻿using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

public class AdManager : MonoBehaviour
{
    GameObject adConfirm;
    LevelController lc;
    public void Start()
    {
        
    }
    public void upDialog()
    {
        lc = GameObject.FindObjectOfType<LevelController>();
        lc.ShowAdsDialogUI();
    }
    public void downDialog()
    {
        lc = GameObject.FindObjectOfType<LevelController>();
        lc.HideAdsDialogUI();
    }
    public void goToTitle()
    {
        Time.timeScale = 1f;
        SceneManager.LoadSceneAsync("StartMenu");
    }
    private void removeThis()
    {
        SceneManager.UnloadSceneAsync("Demo_Scene");
    }

}
